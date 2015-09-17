function Association() {

    return {
        id: "association",
        title: "Association Graph",
        sigInst: null,
        oldColors: {},

        getOptions: function () {
            return '' +
                '<p><label>Threshold: <input type="text" name="threshold" id="associationThreshold" value="0.008"/></label></p>' +
                '<p><label><input type="checkbox" name="visual_variables[]" value="diseases"/> Diseases</label></p>' +
                '<p><label><input type="checkbox" name="visual_variables[]" value="patients"/> Patients</label></p>' +
                '<p><label><input type="checkbox" name="association_nlp" value="nlp"/> NLP Associations</label></p>' +
                '<p><button id="associationForceDirect">Force Direct Layout</button></p>' +
                '';
        },

        saveFigure: function () {
            var currentOrder = visualizations.savedFigures.length - 1;

            //time
            var t = new Date();

            return '' +
                '<li>' +
                    '<div class="save-header">' + 
                        '<button id="Removed' + currentOrder + '" class="btn btn-default btn-xs">' + 
                            '<span class="glyphicon glyphicon-remove"></span>' + 
                        '</button>' +
                        '<button id="Display' + currentOrder + '" class="btn btn-default btn-xs">' + 
                            '<span class="glyphicon glyphicon-new-window"></span>' + 
                        '</button>' + 
                        '<span class="glyphicon glyphicon-eye-open"></span>Associations' + '<br>' + t +
                    '</div>' + 
                '';        
            },

        onLoad: function () {
            // start layout button
            $('#associationForceDirect').on('click', function (evt) {
                evt.preventDefault();

                // use a running="true|false" attribute on the button
                if ($(this).attr('running') == 'true') {
                    $(this).attr('running', 'false');
                    $(this).html('Force Direct Layout');
                    visualizations.get("association").sigInst.stopForceAtlas2();
                } else {
                    $(this).attr('running', 'true');
                    $(this).html('Stop Layout');
                    visualizations.get("association").sigInst.startForceAtlas2();
                }
            });
        },

        onLoadsave: function() {
            var currentOrder = visualizations.savedFigures.length - 1;
            // convert canvas to img and then draw on the same canvas
            var CanvasID = "Canvas" + currentOrder.toString();
            var currentCanvas = document.getElementById(CanvasID);
            var canvasinAsso = [document.getElementById("sigma_edges_1"), document.getElementById("sigma_nodes_1"), document.getElementById("sigma_labels_1"), document.getElementById("sigma_hover_1"), document.getElementById("sigma_mouse_1")];
            for(i = 0; i < 5; i++) {
                currentCanvas.getContext("2d").drawImage(Canvas2Image.convertToImage(canvasinAsso[i]), -80, 0, 270, 135);
            }
            // set variables for enabling buttons
            var displayButton = '#listOfSavedFigures .save-header button[id="Display' + currentOrder + '"]';
            var deleteButton = '#listOfSavedFigures .save-header button[id="Removed' + currentOrder + '"]';

            // set up the display button
            $(displayButton).on('click', function () {
                var idstring = $(this).attr("id");
                var orderInt = parseInt(idstring.substr(idstring.length - 1, 1));
                var temp = visualizations.associationGraphs;
                visualizations.get("association").getAndRender(visualizations.savedFigures[orderInt]);
                visualizations.associationGraphs = visualizations.savedFigures[orderInt];
                visualizations.savedFigures[orderInt] = temp;
           });

            // set the remove button
            $(deleteButton).on('click', function () {
                var idstring = $(this).attr("id");
                var orderInt = parseInt(idstring.substr(idstring.length - 1, 1));
                $(this).parent("div").parent("li").remove();
                visualizations.savedFigures.splice(orderInt,1);
                visualizations.changeID(orderInt);
            })
        },

        getAndRender: function (params) {

            // gather the list of what to show in the graph
            var opts = [];
            $(params['visual_variables']).each(function () {
                opts.push({ name: this, value: 1 });
            });

            // update with filters
            // opts = $.extend(true, opts, params);
            opts.push({ name: "tag", value: params['tag'] });
            opts.push({ name: "threshold", value: params['threshold'] });

            // default to full graph
            var graphUrl = 'gexf.xml?' + $.param(opts);

            // for specific diseases ...
            if (params['diseases']) {
                // specifically for nlp associations ...
                if (params['association_nlp']) {
                    graphUrl = encodeURI('nlp/[' + params['diseases'] + '].xml?' + $.param(opts));
                } else {
                    graphUrl = encodeURI('gexf/[' + params['diseases'] + '].xml?' + $.param(opts));
                }
            }

            loadingGraphic.hide();
            this.draw(graphUrl);
        },

        draw: function (graphUrl) {

            var red_color = '#E44424';
            var blue_color = '#67BCDB';
            var green_color = '#A2AB58';

            // clear selected diseases
            // TODO this isn't such a great idea ... find a better way?
            filters.clearSelectedDiseases();

            // reset list of old colors for nodes
            this.oldColors = {};

            // initialize the sigInst if it was not already done
            if (this.sigInst == null) {
                this.init();
            }

            // redraw the graph
            this.sigInst.emptyGraph();
            this.sigInst.parseGexf(graphUrl);
            this.sigInst.draw();
        },

        init: function () {
            var props = {
                defaultLabelColor: '#222',
                defaultLabelSize: 14,
                defaultLabelBGColor: '#fff',
                labelThreshold: 8,
                defaultEdgeType: 'curve',
                edgeColor: 'source',
                defaultEdgeColor: '#000',
                edgeLabels: false
            };

            this.sigInst = sigma.init(
                    document.getElementById('sig_large')
                ).drawingProperties(props).graphProperties({
                    minNodeSize: 1,
                    maxNodeSize: 20,
                    minEdgeSize: 1,
                    maxEdgeSize: 25,
                    sideMargin: 20
                }).mouseProperties({
                    maxRatio: 32
                });

            // Bind events :
            this.sigInst.bind('downnodes', function (event) {
                var redraw = false;
                event.target.iterNodes(function (n) {
                    if (n.color == '#E44424') {
                        // A selected node is being de-selected.

                        // Restore its original color
                        n.color = visualizations.get("association").oldColors[n.id];

                        // Remove it from the selected node list.
                        filters.removeSelectedDisease(n.id);

                    } else {
                        // Selecting a node

                        // Save the original color
                        visualizations.get("association").oldColors[n.id] = n.color;
                        // Color it red
                        n.color = '#E44424';

                        // Add it to the selected node list
                        filters.addSelectedDisease(n.id, n.label);
                    }
                    redraw = true;

                }, [event.content[0]]);

                if (redraw) event.target.draw();
            });

            this.sigInst.bind('overnodes',function (event) {
                var nodes = event.content;
                var neighbors = {};
                var over_node = event.target.getNodes(nodes[0]);
                if (over_node.label != 'Diseases'
                    && over_node.label != 'Patients'
                    && over_node.label != 'Locations') {

                    event.target.iterEdges(function (e) {
                        if (nodes.indexOf(e.source) >= 0 || nodes.indexOf(e.target) >= 0) {
                            neighbors[e.source] = 1;
                            neighbors[e.target] = 1;
                        }
                    }).iterNodes(function (n) {
                            if (!neighbors[n.id] && n.id != over_node.id) {
                                n.hidden = 1;
                            } else {
                                n.hidden = 0;
                            }
                        }).draw(2, 2, 2);
                }
            }).bind('outnodes', function (event) {
                    event.target.iterEdges(function (e) {
                        e.hidden = 0;
                    }).iterNodes(function (n) {
                            n.hidden = 0;
                        }).draw(2, 2, 2);
                });

            // Draw the graph
            this.sigInst.draw();
        }
    };
}