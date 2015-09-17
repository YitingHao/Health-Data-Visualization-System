var myLayout = null;

var visualizations = {
    items: [],
    current: null,
    associationGraphs: null,
    ringGraph: null,
    themeRiver: null,
    spatialTemporal: null,
    savedFigures: [],

    add: function (item) {
        this.items[item.id] = item;
    },

    ids: function () {
        return Object.keys(this.items);
    },

    setCurrent: function (id) {
        this.current = this.items[id];
        if (this.current) {
            $("#currentVisualization").html(this.current.title);

            var options = this.current.getOptions();
            options = options == null ? '<i>None required for this visualization</i>' : options;
            $("#currentVisualizationOptions").html(options);
            if (this.current.hasOwnProperty("onLoad")) {
                this.current.onLoad();
            }
        }
    },

    saveSelected: function (id) {
        var savePara = this.items[id].saveFigure();
        $("#listOfSavedFigures").append(savePara);
        visualizations.items[id].onLoadsave();
    },

    changeID: function (order) {
        var buttonlist = $('#listOfSavedFigures li').find("button"); 
        for (var i = 0; i < buttonlist.length; i++) {
            var id = buttonlist[i].id;
            var refer = '#' + id;
            if (id.substr(7,1) > order) {
                var changedID = id.substr(0,7) + (parseInt(id.substr(7,1)) - 1).toString();
                $(refer).attr("id", changedID);
            }
        }
    },

    get: function (id) {
        return this.items[id];
    },

    renderCurrent: function () {
        // fail quietly if no visualization selected
        if (this.current == null) {
            return;
        }

        // remove apply changes if it is shown
        $("#applyChanges").fadeOut();

        // show the loading graphic
        loadingGraphic.show();

        // save each choice first
        switch(this.current.id) {
            case "association":
            visualizations.associationGraphs = filters.json();
            // console.log(visualizations.associationGraphs);
            break;
            case "angular":
            visualizations.ringGraph = filters.json();
            // console.log(visualizations.ringGraph);
            break;
            case "diseasestream":
            visualizations.themeRiver = filters.json();
            // console.log(visualizations.themeRiver);
            break;
            case "chloropleth":
            visualizations.spatialTemporal = filters.json();
            // console.log(visualizations.spatialTemporal);
            break;
        }

        // make the data request
        this.current.getAndRender(filters.json());
        //console.log(filters.json());
    },

    renderCurrentIfFirstTime: function () {
        if (this.current.lastRender == null) {
            this.renderCurrent();
        }
    },

    svgToCanvas: function (svg, canvas, xi, yi, x, y) {
        // add the version, xmlns, and xmlns:xlink attributes to SVG node
        svg.setAttribute("version", "1.1");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

        // add stylesheet properties to SVG
        var used = "";
        var sheets = document.styleSheets;
        for (var i = 0; i < sheets.length; i++) {
            var rules = sheets[i].cssRules;
            for (var j = 0; j < rules.length; j++) {
                var rule = rules[j];
                if (typeof(rule.style) != "undefined") {
                    var elems = svg.querySelectorAll(rule.selectorText);
                    if (elems.length > 0) {
                    used += rule.selectorText + " { " + rule.style.cssText + " }\n";
                    }
                }
            }
        }

        var s = document.createElement('style');
        s.setAttribute('type', 'text/css');
        s.innerHTML = "<![CDATA[\n" + used + "\n]]>";
         
        var defs = document.createElement('defs');
        defs.appendChild(s);
        svg.insertBefore(defs, svg.firstChild);

        // image source
        var image = new Image();
        image.src = 'data:image/svg+xml;base64,' + window.btoa(outerHTML(svg));
        canvas.getContext("2d").drawImage(image,xi,yi,x,y);

        function outerHTML(el) {
            var outer = document.createElement('div');
            outer.appendChild(el.cloneNode(true));
            console.log(el.cloneNode(true));
            return outer.innerHTML;
        }
    }
}

var filters = {

    selectedNodes: [],

    clearSelectedDiseases: function () {
        this.selectedNodes = [];
        $("input[name='diseases']").val("");
        $("#selectedDiseases li").remove();
    },

    removeSelectedDisease: function (id) {
        var disease = $.isNumeric(id) ? "dis_" + id.toString() : id;

        // remove from selectedNodes
        this.selectedNodes = $.grep(this.selectedNodes, function (val) {
            return val != disease;
        });

        // remove from filters
        $("#selectedDiseases a[disease=" + id + "]").parent("li").remove();

        // update hidden form field
        $('input[name=diseases]').val(this.selectedNodes.toString());

        // show apply changes link
        $("#applyChanges").fadeIn();
    },

    addSelectedDisease: function (id, label) {
        var disease = $.isNumeric(id) ? "dis_" + id.toString() : id;

        // only add if it does not already exist
        if (this.selectedNodes.indexOf(disease) == -1) {

            // update selected nodes variable
            this.selectedNodes.push(disease);

            // update display of selected diseases
            $('#selectedDiseases').append(
                '<li><a href="#" class="removeDisease" disease="' + id +
                    '"><span class="glyphicon glyphicon-remove"></span></a> ' + label +
                    ' </li>');

            // update hidden form field
            $('input[name=diseases]').val(this.selectedNodes.toString());

            // show apply changes link
            $("#applyChanges").fadeIn();
        }
    },

    json: function () {
        // get the latest filters into a JSON object
        var data = $("#filterForm").serializeJSON();

        // add race codes if certain ones are selected (ugh)
        if ($.inArray('W', data['race']) > -1) data['race'].push('C');
        if ($.inArray('A', data['race']) > -1) data['race'].push('3');
        if ($.inArray('H', data['race']) > -1) data['race'].push('5');

        return data;
    }
}

var loadingGraphic = {
    container: "#loadingGraphic",
    fadeSpeed: 500,

    hide: function () {
        $(loadingGraphic.container).fadeOut(loadingGraphic.fadeSpeed, function () {
            if (visualizations.current.hasOwnProperty("container")) {
                $(visualizations.current.container).fadeIn(loadingGraphic.fadeSpeed);
            }
        });
    },
    show: function () {
        // set height
        var height = $("#main-stage").offsetHeight;
        $(loadingGraphic.container).css("height", height);
        $(loadingGraphic.container).css("margin-top", -1 * height / 2);

        // hide the container, or just show the loading graphic if there is none specified
        if (visualizations.current.hasOwnProperty("container")) {
            $(visualizations.current.container).fadeOut(loadingGraphic.fadeSpeed, function () {
                $(loadingGraphic.container).fadeIn(loadingGraphic.fadeSpeed);
            });
        } else {
            $(loadingGraphic.container).fadeIn(loadingGraphic.fadeSpeed);
        }
    }
}

var currentData = {};

$(document).ready(function () {

    // set up the visualizations
    visualizations.add(Association());
    visualizations.add(Angular());
    visualizations.add(Chloropleth());
    visualizations.add(DiseaseStream());

    // set up datepickers
    $(".datepicker").datepicker({ format: "yyyy-mm-dd" });

    // show apply changes link when inputs change in filters
    $("#filters").delegate('input:not(.noapply)', 'change', function (evt) {
        $("#applyChanges").fadeIn();
    });

    // handle applying changes in the sidebar
    $("#applyChanges").click(function (evt) {
        evt.preventDefault();
        $("#applyChanges").fadeOut();
        visualizations.renderCurrent();
    });

    // set up layout
    myLayout = $('body').layout({
        fxName: "none",
        resizable: false,
        closable: true,
        spacing_open: 0,
        west__size: 360,
        west__onresize: $.layout.callbacks.resizePaneAccordions,
        center__childOptions: {
            south__size: 0.5,
            center__childOptions: {
                east__size: 0.5
            },
            south__childOptions: {
                east__size: 0.5
            }
        }
    });

    // allow time for browser to re-render with new theme
    setTimeout(myLayout.resizeAll, 1000);

    // click events for visualization selectors
    $(".vis-header button").on('click', function () {
        var target = $(this).attr("target");

        $(target).show();

        // update the current visualization
        visualizations.setCurrent($(this).attr("vis"));

        $(this).blur();

        // switch to the filters pane
        $("#sidebar").accordion("option", "active", 1);
    });

    // refresh selected visualization
    $("#panel_refresh_1").on('click', function (event) {
        event.preventDefault();
        $("#panel_refresh_1").blur();
        visualizations.items["association"].getAndRender(visualizations.associationGraphs);
    });

    $("#panel_refresh_2").on('click', function (event) {
        event.preventDefault();
        $("#panel_refresh_2").blur();
        visualizations.items["angular"].getAndRender(visualizations.ringGraph);
    });

    $("#panel_refresh_3").on('click', function (event) {
        event.preventDefault();
        $("#panel_refresh_3").blur();
        visualizations.items["diseasestream"].getAndRender(visualizations.themeRiver);
    });

    $("#panel_refresh_4").on('click', function (event) {
        event.preventDefault();
        $("#panel_refresh_4").blur();
        visualizations.items["chloropleth"].getAndRender(visualizations.spatialTemporal);
    });

    // save selected visualization
    $("#panel_save_1").on('click', function (event) {
        event.preventDefault();
        visualizations.savedFigures.push(visualizations.associationGraphs);
        console.log(visualizations.savedFigures);
        $(this).blur();
        visualizations.saveSelected("association");
    });

    $("#panel_save_2").on('click', function (event) {
        event.preventDefault();
        visualizations.savedFigures.push(visualizations.ringGraph);
        console.log(visualizations.savedFigures);
        $(this).blur();
        visualizations.saveSelected("angular");
    });

    $("#panel_save_3").on('click', function (event) {
        event.preventDefault();
        visualizations.savedFigures.push(visualizations.themeRiver);
        console.log(visualizations.savedFigures);
        $(this).blur();
        visualizations.saveSelected("diseasestream");
    });

    $("#panel_save_4").on('click', function (event) {
        event.preventDefault();
        visualizations.savedFigures.push(visualizations.spatialTemporal);
        console.log(visualizations.savedFigures);
        $(this).blur();
        visualizations.saveSelected("chloropleth");
    });

    // going full-screen (or back)
    $("#panel_fullscreen_1, #panel_fullscreen_2, #panel_fullscreen_3, #panel_fullscreen_4").on('click', function (event) {
        event.preventDefault();

        if ($(this).find("span").attr("class") == "glyphicon glyphicon-resize-full") {
            $("#resizePic_1, #resizePic_2, #resizePic_3, #resizePic_4").attr("class", "glyphicon glyphicon-resize-small");
        } else {
            $("#resizePic_1, #resizePic_2, #resizePic_3, #resizePic_4").attr("class", "glyphicon glyphicon-resize-full");
        }
        myLayout.toggle("north");
        myLayout.toggle("south");
        myLayout.toggle("west");

        $(this).blur();
    });

    // disease autocomplete
    $('#disease').autocomplete({
        minLength: 2,
        source: function (request, response) {
            $.ajax({
                accepts: 'json',
                url: "/diseases",
                data: {
                    term: request.term,
                    tags: filters.json()['tag']
                },
                success: function (data) {
                    response(data);
                }
            });
        },
        focus: function (event, ui) {
            $('#disease').val(ui.item.name);
            return false;
        },
        select: function (event, ui) {
            filters.addSelectedDisease(ui.item.id, ui.item.name);
            // clear the text box
            $('#disease').val('');
            return false;
        }
    })
        .data("ui-autocomplete")._renderItem = function (ul, item) {
        return $("<li></li>")
            .data("item.autocomplete", item)
            .append("<a>" + item.name + "</a>")
            .appendTo(ul);
    };

    // disease removal link click events
    $('#selectedDiseases').delegate('a', 'click', function (evt) {
        evt.preventDefault();

        // get the id
        var id = $(this).attr('disease');
        filters.removeSelectedDisease(id);

        return false;
    });

    // 'all' links in filters
    $('a.selectAll').click(function (evt) {
        evt.preventDefault();
        $($(this).parents('div')[0]).find('input[type=checkbox]').prop('checked', true);

        // show apply changes link
        $("#applyChanges").fadeIn();
    });


    // 'none' links in filters
    $('a.selectNone').click(function (evt) {
        evt.preventDefault();
        $($(this).parents('div')[0]).find('input[type=checkbox]').prop('checked', false);

        // show apply changes link
        $("#applyChanges").fadeIn();
    });

    // set up the Disease Sources filter
    $.ajax({
        accepts: 'json',
        url: '/diseasetags',
        success: function (data) {
            $(data).each(function () {
                var tag = this['tag'];
                var field = '<p><label for="??"><input id="diseasetag??" type="checkbox" name="tag[]" value="??" checked="checked"/> ??</label></p>';
                $("#diseasetags").append(field.replace(/\?\?/g, tag));
            });
        }
    });
});
