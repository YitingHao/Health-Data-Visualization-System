var tension_global;
var bri;
var num_of_group;


function Angular() {
    //default tension = 1.0
    tension_global = 1.0;
    bri = 1.0;
    return {
        id: "angular",
        title: "Ring Graph",
        container: "#angular_container",

        getOptions: function(){
            return '' +
                '<p><label><input type="radio" name="group1" id="ring_graph"checked/>Ring Graph</label></p>' +
                '<p><label><input type="radio" name="group1" id="spiral"/>Spiral Theme River</label></p>' +
                '<p><label>Curve brightness</label></p>' +
                '<div id="brightness_slider"></div>' + '<br>' +
                '<p><label>Tension Coefficient</label></p>' + 
                '<div id="tension_slider"></div>' + '<br>' +
                '<p><label>Group Number: <input type="text" name="group_num" id="Group_Number" value="10"/></label></p>'
                + '';
        },

        saveFigure: function() {
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
                        '<span class="glyphicon glyphicon-eye-open"></span>Ring Graph' + '<br>' + t +
                    '</div>' + 
                    '<div class="save-body"><canvas id="Canvas' + currentOrder + '"></canvas></div>' +
                '';        
            },


        onLoad: function(){

            //console.log(document.getElementById("Group_Number").value);
            $("#brightness_slider").slider({
                value:20,
                min: 0,
                max: 100,
                step: 10,
                slide: function( event, ui ) {
                    bri = 100 - ui.value;

                    //change scale from 0~100 to 20~80 to show meaningful color\
                    lightness = 20 + 0.6 * bri;

                    //console.log(lightness);
                    $(".link").css("stroke", "hsl(207, 44%," + lightness + "%)");
                }
            });

            //implement tension TO DO
              $("#tension_slider").slider({
                value:100,
                min: 0,
                max: 200,
                step: 10,
                slide: function( event, ui ) {
                    //console.log(ui.value);
                    tension_global = ui.value/100.00;
                    //console.log(tension_global);
                    $("#applyChanges").fadeIn();
                }
            });
        },

        onLoadsave: function() {
            var currentOrder = visualizations.savedFigures.length - 1;

            // draw svg on canvas
            var CanvasID = "Canvas" + currentOrder.toString();
            var svg = document.getElementById("ringGraphSVG");
            var currentCanvas = document.getElementById(CanvasID);
            visualizations.svgToCanvas(svg, currentCanvas, 0, 0, 150, 150);
            
            // draw div on canvas
            html2canvas($("#ang_legend"), {
                onrendered: function(canvas) {
                    currentCanvas.getContext("2d").drawImage(Canvas2Image.convertToImage(canvas), 145, 10, 40, 35);
                }
            });

            // set variables for enabling buttons
            var displayButton = '#listOfSavedFigures .save-header button[id="Display' + currentOrder + '"]';
            var deleteButton = '#listOfSavedFigures .save-header button[id="Removed' + currentOrder + '"]';

            // set up the display button
            $(displayButton).on('click', function () {
                var idstring = $(this).attr("id");
                var orderInt = parseInt(idstring.substr(idstring.length - 1, 1));
                var temp = visualizations.ringGraph;
                visualizations.get("angular").getAndRender(visualizations.savedFigures[orderInt]);
                visualizations.ringGraph = visualizations.savedFigures[orderInt];
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

        getAndRender: function(filters){
            var url = "/fetch_occurrences";

            // add custom data fields
            var opts = {
                start_date: filters["startDate"],
                end_date: filters["endDate"],
                selected_nodes: filters["diseases"]
            }

            // add filters
            opts = $.extend(true, opts, filters);

            var callback = this.draw;

            $.ajax({
                accepts: 'json',
                url: url,
                data: opts,
                success: function(data, textStatus, jqXHR) {
                    callback(data);
                    loadingGraphic.hide();
                }
            });
        },

        draw: function (occurrence_data) {
            console.log(occurrence_data);
            // set up parameters that will be used in both drawings - ringgraph and spiral
            // sort data based on date
            var sorted_occurrences = occurrence_data['occurrences'].sort(sort_date),
                width = Math.min(document.getElementById('main-stage-2').offsetWidth, document.getElementById('main-stage-2').offsetHeight),
                height = width,
                start_date = new Date(occurrence_data['start_date']),
                end_date = new Date(occurrence_data['end_date']),
                total_elapsed = occurrence_data['total_elapsed'],
                ages = sorted_occurrences.map(function (d) {return d['age'];}),
                min_age = d3.min(ages),
                max_age = d3.max(ages),
                races = ['A', 'B', 'C', 'H', 'U', 'W', 'X', '3', '5', '9'],
                num_of_group = parseInt(document.getElementById("Group_Number").value),
                eachGroup = Math.floor(total_elapsed / num_of_group);
            // set up functions that will be used in both drawings - ringgraph and spiral
            // function: sorting based on date
            function sort_date(a, b) {
                var aDate = new Date(a.occurrence_date);
                var bDate = new Date(b.occurrence_date);
                if (aDate > bDate) {
                    return 1;
                } else if (aDate == bDate) {
                    return 0;
                } else {
                    return -1;
                }
            }
            // function: construct the package hierarchy from class names
            function packageHierarchy(cluster_points) {
                var map = {};
                function find(name, data) {
                    var node = map[name], i;
                    if(!node) {
                        node = map[name] = data || {name: name, children: []};
                        if (name.length) {
                            node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
                            node.parent.children.push(node);
                            node.key = name.substring(i + 1);
                        }
                    }
                    return node;
                }
                cluster_points.forEach(function (d) {
                    find(d.name, d);
                });
                return map[""];
            }
            // Return a list of imports for the given array of nodes
            function packageImports(nodes) {
                var map = {},
                    imports = [];
                nodes.forEach(function (d) {
                    map[d.name] = d;
                })
                nodes.forEach(function (d) {
                    if (d.imports) {
                        d.imports.forEach(function (i) {
                            imports.push({source: map[d.name], target: map[i]});
                        });
                    }
                });
                return imports;
            }
            function getColor(index) {
                var colors = {
                    1: '#1f77b4',
                    2: '#aec7e8',
                    3: '#ff7f0e',
                    4: '#ffbb78',
                    5: '#2ca02c',
                    6: '#98df8a',
                    7: '#d62728',
                    8: '#ff9896',
                    9: '#9467bd',
                    10: '#c5b0d5',
                    11: '#8c564b',
                    12: '#c49c94',
                    13: '#e377c2',
                    14: '#f7b6d2',
                    15: '#7f7f7f',
                    16: '#c7c7c7',
                    17: '#bcbd22',
                    18: '#dbdb8d',
                    19: '#17becf',
                    20: '#9edae5'
                };
                return colors[index % 20];
            }
            if ($("#ring_graph").is(':checked')) {
                d3.select("svg").remove();
                $("#temp_canvas").remove();
                $("#temp_div").remove();
                // set up parameters whicl will be used only for ring_graph drawing
                var center_padding = width / 36;
                var label_padding = width / 10.8;
                var radius = Math.min(width, height) / 2;
                var center = { x: 0, y: 0 };
                var useable_radius = radius - center_padding - label_padding;
                var radius_band_size = useable_radius / occurrence_data['num_diseases'];
                // get groupNumber from user
                // console.log(total_elapsed, eachGroup, num_of_group);
                var time_group = [];
                for (var i = 0; i < num_of_group; i++) {
                    if (i != num_of_group - 1) {
                        time_group.push([eachGroup * i, eachGroup * (i + 1) -1]);
                    }else {time_group.push([eachGroup * i, total_elapsed]);}
                }
                // console.log(time_group);
                // build up disease bands
                var disease_bands = {};
                occurrence_data['occurrence_counts'].forEach(function (disease_count, index) {
                    disease_bands[disease_count['name']] = {
                        disease: disease_count['name'],
                        index: index,
                        num_occurrences: disease_count['num_occurrences'],

                        //num
                        //console.log(disease_count['num_occurrences']);

                        rad_start: center_padding + index * radius_band_size,
                        rad_end: center_padding + (index + 1) * radius_band_size
                    }
                })
                // scale the elapsed days values from 0 to 2PI radians to form angles
                var elapsedScale = d3.scale.linear().domain([0, occurrence_data['total_elapsed']]).range([5, 355]);
                // return points
                var points = sorted_occurrences.map(function (occur) {
                    // age position
                    var age = parseInt(occur['age'], 10);
                    var age_percentile = (age - min_age) / (max_age - min_age);
                    // radius for each point
                    var disease = occur['disease'];
                    var disease_info = disease_bands[disease];
                    var rad = disease_info['rad_start'] + age_percentile * (disease_info['rad_end'] - disease_info['rad_start']);
                    // time group for each point
                    var label_time = group_time(occur['elapsed_days'], time_group);
                    return {
                        x: elapsedScale(occur['elapsed_days']),
                        y: rad,
                        disease: occur['disease'],
                        patient_gid: occur['patient_gid'],
                        gender: occur['gender'],
                        race: occur['race'],
                        age: age,
                        date: occur['occurrence_date'],
                        elapsed: occur['elapsed_days'],
                        label_time: label_time
                    };
                });
                // console.log(points);
                // set up svg
                var svg = d3.select("#angular_container").append("svg")
                    .attr("id", "ringGraphSVG")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
                // call other draw functions
                drawDiseaseBands(svg);
                drawPoints(svg, points);
                // drawGraphLabels(svg, radius, sorted_occurrences, start_date, end_date, total_elapsed);
                $(".modal-dialog").height('auto');
                $(".modal-dialog").width('auto');
                // function to draw bands
                function drawDiseaseBands(svg) {
                    // set sorted disease bands
                    var sorted_disease_bands = d3.values(disease_bands).sort(function (a, b) {
                        var aIndex = a['index'];
                        var bIndex = b['index'];
                        if (aIndex < bIndex) {return -1;}
                        else if (aIndex == bIndex) {return 0;}
                        else {return 1;}
                    });
                    // set up arc generator
                    var arc = d3.svg.arc()
                        .innerRadius(function (d) {return d['rad_start'];})
                        .outerRadius(function (d) {return d['rad_end'];})
                        .startAngle(3.22885912)
                        .endAngle(9.3375115);
                    // arcs drawing
                    var arcs = svg.append("g");
                    arcs.selectAll("path")
                        .data(sorted_disease_bands)
                        .enter()
                        .append("path")
                        .style("fill", function (d) {
                            var returnColor;

                            //Default is #efefef & #dfdfdf
                            if (d['index'] % 2 == 0) {returnColor = "#F6CEF5";}
                            else {returnColor = "#F5F6CE";}
                            return returnColor;
                        })
                        .attr("d", arc)
                        .style("stroke-width", 0)
                        .append("svg:title")
                        .text(function (d) {return d['disease'];})
                    // d3.select("#ang_legend").remove();
                    // var container = d3.select("#angular_container");
                    // var legend = container.append("div")
                    //     .attr("id", "ang_legend");
                    // d3.select("#ang_legend")
                    //     .style("position", "absolute")
                    //     .style("border", "1px solid rgb(85, 85, 85)")
                    //     .style("font-size", width / 67.5 + "px")
                    //     .style("top", "10px")
                    //     .style("z-index", "999")
                    //     .style("box-shadow", "5px 5px 4px rgb(153, 153, 153)")
                    //     .style("left, 45px")
                    //     ;
                    // var style_div = legend.append("div");
                    // var disease_span = legend.append("span");
                    // style_div.style("font-weight", "bold")
                    //     .style("padding", width / 216 + "px " + width / 108 + "px")
                    //     .style("border-bottom", "1px solid rgb(85, 85, 85)")
                    //     .style("background", "#DEE")
                    //     .style("repeat scroll 0% 0% rgb(204, 221, 255)");
                    // style_div.html("Legend");
                    // disease_span.selectAll("div")
                    //     .data(sorted_disease_bands)
                    //     .enter().append("div")
                    //     .style("padding", width / 216 + "px " + width / 108 + "px")
                    //     .text(function(d, i) {
                    //         if (i == 0) {
                    //             return d['disease'] + " (outer)";
                    //         } else {
                    //             return d['disease'];
                    //         }
                    //     });
                }
                // function to draw points and links
                function drawPoints(svg, points) {
                    // set up relative parameters
                    var size = width / 360;
                    // rearrange data into desired format for cluster layout
                    var patient_points = d3.nest()
                                .key(function (d) {return d.patient_gid;})
                                .sortKeys(d3.ascending)
                                .entries(points);
                    var patient_gid_array = patient_points.map(function (d) {return d.key;})
                    var cluster_points = [];
                    for (var i = 0; i < patient_points.length; i ++) {
                        for (var j = 0; j < patient_points[i]['values'].length; j ++) {
                            var this_name = "all." + patient_points[i]['values'][j]['label_time'] + "." + patient_points[i]['key'] + "#" + j;
                            if (j < patient_points[i]['values'].length - 1) {
                                var next_name = "all." + patient_points[i]['values'][j + 1]['label_time'] + "." + patient_points[i]['key'] + "#" + (j + 1);
                                cluster_points.push({"name": this_name, "values": patient_points[i]['values'][j], "imports": [next_name]});
                            } else {
                                cluster_points.push({"name": this_name, "values": patient_points[i]['values'][j], "imports": []});
                            }
                        }
                    }
                    // console.log(cluster_points);
                    // set up parameter and generators
                    // get tension from user
                    //*******var tension = 1.0;
                    var cluster = d3.layout.cluster()
                            .size([360, radius - label_padding])
                            .sort(null)
                    var bundle = d3.layout.bundle();
                    var line = d3.svg.line.radial()
                                .interpolate("bundle")
                                .tension(tension_global)
                                .radius(function (d) {return d.y;})
                                .angle(function (d) {return d.x / 180 * Math.PI;});
                    // start building cluster layout
                    var nodes = cluster.nodes(packageHierarchy(cluster_points));
                    // change the x & y coordiante in each node
                    var changeNodes = nodes.map(function (d) {
                        if (!d.children) {
                            d.x = d.values.x + 180; d.y = d.values.y; return d;
                        }else if(d.depth == 2) {
                            d.x = parseInt(d.key) * (350 / num_of_group) + 185; 
                            d.y = useable_radius / 2 + center_padding; 
                            return d;
                        }else { d.x = 0; d.y = 0; return d;}
                    })
                    // draw links first
                    var links = packageImports(changeNodes);
                    var linkpath = svg.selectAll(".link")
                                    .data(bundle(links))
                                    .enter()
                                    .append("path")
                                    .each(function(d) {d.source = d[0], d.target = d[d.length - 1];})
                                    .attr("class", "link")
                                    .attr("d", line);
                    // set up tooltip
                    var tooltip = d3.tip()
                        .attr("class", "d3-tip")
                        .offset([-10, 0])
                        .html(function (d) {
                            return "<div style='background: none repeat scroll 0% 0% lightgoldenrodyellow; z-index: 9999; box-shadow: 5px 5px 4px rgb(119, 119, 119); padding: 10px; opacity: 0.5'>\
                                    <div><strong>Disease:</strong> " + d.values.disease + "</div>\
                                    <div><strong>Gender:</strong> " + d.values.gender + "</div>\
                                    <div><strong>Race:</strong> " + d.values.race + "</div>\
                                    <div><strong>Age:</strong> " + d.values.age + "</div>\
                                    <div><strong>Date:</strong> " + d.values.date + "</div>\
                                    </div>";
                        });
                    svg.call(tooltip);
                    // draw each point to circle or rect based on gender
                    var shapes = changeNodes.filter(function (n) {return !n.children;});
                    var female = shapes.filter(function (d) {if (d.values.gender === "F") {return d;}});
                    var male = shapes.filter(function (d) {if (d.values.gender === "M") {return d;}});
                    var circleF = svg.append("g")
                                .selectAll("circle")
                                .data(female)
                                .enter()
                                .append("circle")
                                .attr("cx", function (d) {
                                    return Math.sin(- (d.x - 180) / 180 * Math.PI) * d.y;
                                })
                                .attr("cy", function (d) {
                                    return Math.cos(- (d.x - 180) / 180 * Math.PI) * d.y;
                                })
                                .attr("r", size / 2)
                                .attr("fill", function (d) {
                                    return getColor(races.indexOf(d.values.race));
                                })
                                .attr("stroke-width", 0)
                                .on("mouseover", function (d) {mouseovered(d, circleF);})
                                .on("mouseout", function (d) {mouseouted(d, circleF)});
                    var rectM = svg.append("g")
                                .selectAll("rect")
                                .data(male)
                                .enter()
                                .append("rect")
                                .attr("x", function (d) {
                                    return Math.sin(- (d.x - 180) / 180 * Math.PI) * d.y;
                                })
                                .attr("y", function (d) {
                                    return Math.cos(- (d.x - 180) / 180 * Math.PI) * d.y;
                                })
                                .attr("width", size)
                                .attr("height", size)
                                .attr("fill", function (d) {
                                    return getColor(races.indexOf(d.values.race));
                                })
                                .attr("stroke-width", 0)
                                .on("mouseover", function (d) {mouseovered(d, rectM);})
                                .on("mouseout", function (d) {mouseouted(d, rectM);});
                    // set up mouseover and mouseout function for highlight
                    function mouseovered(d, draw) {
                        tooltip.show(d);
                        draw.each(function (n) {n.highlight = false;});
                        var patient_gid = d.key.substring(0, i = d.key.lastIndexOf("#"));
                        var occurrence_times  = patient_points[patient_gid_array.indexOf(patient_gid)].values.length;
                        var occurrence_names = [];
                        if (occurrence_times > 1) {
                            for (var j = 0; j < occurrence_times - 1; j++) {
                            var name = d.key.substring(0, i = d.key.lastIndexOf("#") + 1) + j.toString();
                                occurrence_names.push(name);
                            }
                            linkpath.classed("link_highlight", function (l) {
                                var index = occurrence_names.indexOf(l.source.key);
                                if (index == 0) {return l.source.highlight = l.target.highlight = true;}
                                else if (index != 0 && index != -1) {return l.target.highlight = true;}
                            });
                        }
                        draw.classed("node_highlight", function (n) {return n.highlight;})
                    }
                    function mouseouted(d, draw) {
                        tooltip.hide(d);
                        linkpath.classed("link_highlight", false);
                        draw.classed("node_highlight", false)
                    }
                }
                // function drawGraphLabels(svg, radius, sorted_occurrences, start_date, end_date, total_elapsed) {
                //     var cScale = d3.scale.linear().domain([5, 355]).range([0.0872664626, 6.19591884]);
                //     //var cScale = d3.scale.linear().domain([-5, -355]).range([0, 6.28318531]);
                //     //  var percentElapsed = d3.scale.linear().domain([5,-355]).range([0, -1.0]);
                //     var percentElapsed = d3.scale.linear().domain([5, 355]).range([0, 1.0]);

                //     var label_data = [
                //         [5, 15],
                //         [15, 25],
                //         [25, 35],
                //         [35, 45],
                //         [45, 55],
                //         [55, 65],
                //         [65, 75],
                //         [75, 85],
                //         [85, 95],
                //         [95, 105],
                //         [105, 115],
                //         [115, 125],
                //         [125, 135],
                //         [135, 145],
                //         [145, 155],
                //         [155, 165],
                //         [165, 175],
                //         [175, 185],
                //         [185, 195],
                //         [195, 205],
                //         [205, 215],
                //         [215, 225],
                //         [225, 235],
                //         [235, 245],
                //         [245, 255],
                //         [255, 265],
                //         [265, 275],
                //         [275, 285],
                //         [285, 295],
                //         [295, 305],
                //         [305, 315],
                //         [315, 325],
                //         [325, 335],
                //         [335, 345],
                //         [345, 355],
                //     ];
                //     var quarter = Math.floor(.25 * sorted_occurrences.length);
                //     var half = Math.floor(.5 * sorted_occurrences.length);
                //     var three_quarter = Math.floor(.75 * sorted_occurrences.length);

                //     var pie = d3.layout.pie()
                //         .sort(null)
                //         .value(function (d) {
                //             return cScale(85);
                //         })
                //         .startAngle(-0.0872664626)
                //         .endAngle(-6.19591884);

                //     var arc = d3.svg.arc()
                //         .outerRadius(radius - label_padding)
                //         .innerRadius(0);

                //     var marker_color = "#F5F5F5";
                //     var text_color = "#666";

                //     //console.log(pie(label_data));

                //     var g = svg.selectAll(".arc")
                //         .data(pie(label_data))
                //         .enter().append("g")
                //         .attr("class", "arc");

                //     g.append("path")
                //         .attr("d", arc)
                //         .style("stroke-width", 1)
                //         .style("stroke", marker_color);

                //     g.append("text")
                //         .attr("transform", function (d) {
                //             return "translate(" + (radius - width / 12) * Math.sin(d.endAngle) + "," + (radius - width / 12) * Math.cos(d.endAngle) + ")";
                //         })
                //         .attr("dy", ".35em")
                //         .attr("font-size", width / 67.5 + "px")
                //         .style("text-anchor", function (d) {
                //             var rads = -(((d.endAngle - d.startAngle) / 2) + d.startAngle);
                //             //console.log(rads);
                //             //if ( (rads > 7 * Math.PI / 4 && rads < Math.PI / 4) || (rads > 3 * Math.PI / 4 && rads < 5 * Math.PI / 4) ) {
                //             if ((rads > (Math.PI - .09) && rads < (Math.PI + .05) ) || (rads > (2 * Math.PI - .09) && rads < (2 * Math.PI + .09))) {
                //                 return "middle";
                //                 //} else if (rads >= Math.PI / 4 && rads <= 3 * Math.PI / 4) {
                //             } else if (rads > 0 && rads < Math.PI) {
                //                 return "end";
                //                 //} else if (rads >= 5 * Math.PI / 4 && rads <= 7 * Math.PI / 4) {
                //             } else if (rads > Math.PI && rads < 2 * Math.PI) {
                //                 return "start";
                //             } else {
                //                 return "middle";
                //             }
                //         })
                //         .style("fill", text_color)
                //         .text(function (d) {
                //             var percent = percentElapsed(d.data[1]);
                //             var days = Math.floor(percent * total_elapsed);
                //             var date_stamp = new Date();
                //             date_stamp.setTime(start_date.getTime() + days * 86400000);
                //             return (date_stamp.getMonth() + 1) + '-' + date_stamp.getDate() + '-' + date_stamp.getFullYear()
                //         });
                // }
                // function: to return group number based on time
                function group_time(d, array) {
                    for (var i = 0; i < array.length; i++) {
                        if (d >= array[i][0] && d <= array[i][1]) {return i;}
                    }
                }
            //if 
            }

            if ($("#spiral").is(':checked')) {
                d3.select("svg").remove();
                $("#temp_canvas").remove();
                $("#temp_div").remove();
                // set up parameters which will only be used to spiral
                var start = 0,
                    end = 0,
                    total_radius = d3.min([width, height]) / 2,
                    disease_name = [],
                    stack_data = [],
                    ageScale = d3.scale.linear()
                                .domain([min_age, max_age]),
                    colorpicker = [ {key:"blank", color:{r:0, b:0, g:0}} ];
                // append temporary canvas and div
                // $("#angular_container").append("<canvas id='temp_canvas'></canvas>");
                // $("#angular_container").append("<div id='temp_div'></div>");
                // $("#temp_canvas").attr("width", width);
                // $("#temp_canvas").attr("height", height);
                // construct stack_data
                // console.log(num_of_group, total_elapsed, eachGroup);
                occurrence_data['occurrence_counts'].forEach(function (disease_count, index) 
                {
                    disease_name.push(disease_count['name']);
                    stack_data[index] = {
                        key: disease_count['name'],
                        maxValue: 0,
                        sumValue: disease_count['num_occurrences'],
                        values: []
                    };
                    for(var i = 0; i < num_of_group + 1; i++) {
                        var obj = 
                        {
                            group_number: i,
                            elapsed: i * eachGroup,
                            key: disease_count['name'],
                            value: 0
                        };
                        stack_data[index].values.push(obj);
                        if (i == num_of_group) {stack_data[index].values[i].elapsed = total_elapsed;}
                    }
                })
                // date scaling for both individual and stack data
                var elapsedScale_s = d3.scale.linear()
                                .domain([0, occurrence_data['total_elapsed']])
                                .range([start, end]);
                // extract points info, which is used to draw each dot and generate stack data
                var points_s = sorted_occurrences.map(function (occur) 
                {
                    var age = parseInt(occur['age'], 10),
                        group_number = group_time_spiral(num_of_group, eachGroup, occur['elapsed_days']),
                        index_disease = disease_name.indexOf(occur['disease']);
                    stack_data[index_disease].values[group_number].value ++;
                    return {
                        angle: elapsedScale_s(occur['elapsed_days']),
                        radius: 0,
                        disease: occur['disease'],
                        patient_gid: occur['patient_gid'],
                        gender: occur['gender'],
                        race: occur['race'],
                        age: age,
                        date: occur['occurrence_date'],
                        elapsed: occur['elapsed_days'],
                        group_number: group_number
                    };
                })
                // console.log(points_s);
                // modify stack data
                // maxvalue of each stack data
                stack_data.forEach(function (d) 
                {
                    d.maxValue = d3.max(d.values, function(d) { return d.value; })
                });
                // Sort by maximum value, descending.
                stack_data.sort(function(a, b) 
                {
                    return b.maxValue - a.maxValue;
                });
                disease_name = [];
                stack_data.forEach(function(d, i)
                {
                    // change the disease name order 
                    disease_name[stack_data.length - 1 - i] = (d.key);
                    // set up color picker
                    var returncolor;
                    if (i % 2 == 0) {returncolor = "#dfdfdf";} else {returncolor = "#efefef";}
                    var color_obj = {key: d.key, color: hexToRGB(returncolor), hex_color: returncolor};
                    colorpicker.push(color_obj);
                    // change values[0], starting point
                    d.values[0].value = d.values[1].value;
                });
                // console.log(colorpicker);
                // Set up stack data
                var stack = d3.layout.stack()
                              .values(function(d) { return d.values; })
                              .x(function(d) { return d.group_number; })
                              .y(function(d) { return d.value; })
                              .out(function(d, y0, y) { d.valueS = y0; })
                              .order("reverse");
                stack(stack_data);
                console.log(stack_data);
                // set up angle scaling && radius scaling
                var base_radius = d3.scale.linear()
                            .domain([start, end])
                            .range([0, total_radius * end / (end + 1)]);
                var offset_radius = d3.scale.linear()
                            .domain([0, d3.max(stack_data[0].values.map(function(d) { return d.value + d.valueS; }))])
                            .range([0, total_radius / (end + 1) - 10]);
                // a radial line generator, for stack line
                var line_stack = d3.svg.line.radial()
                        .interpolate("cardinal")
                        .angle(function(d) { return elapsedScale_s(d.elapsed) * 2 * Math.PI; })
                        .radius(function(d) { return base_radius(elapsedScale_s(d.elapsed)) + offset_radius(d.valueS); })
                // a radial area generator, for filled area
                var area = d3.svg.area.radial()
                        .interpolate("cardinal")
                        .angle(function(d) { return elapsedScale_s(d.elapsed) * 2 * Math.PI; })
                        .innerRadius(function(d) { return base_radius(elapsedScale_s(d.elapsed)) + offset_radius(d.valueS); })
                        .outerRadius(function(d) { return base_radius(elapsedScale_s(d.elapsed)) + offset_radius(d.valueS + d.value); })
                // set up svg
                var svg = d3.select("#angular_container")
                    .append("svg")
                    .attr("id", "spiral_svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + total_radius + "," + total_radius + ")");
                // draw lines and areas in spiral
                var g = svg.selectAll("g")
                        .data(stack_data)
                        .enter()
                        .append("g")
                        .each(function (d, i) 
                        {
                            var e = d3.select(this);
                            e.append("path")
                                .attr("class", "line")
                                .style("stroke-opacity", function(d, i) { return i < 3 ? 1e-6 : 1; })
                                .attr("d", function(d) { return line(d.values); })
                                .style("fill", "none")
                                .style("stroke", "#000")
                                .style("storke-width", "2px")
                            e.append("path")
                                .attr("class", "area")
                                .style("fill", colorpicker[i + 1].hex_color)
                                .attr("d", function(d) { return area(d.values); })
                        });                      
                // // draw svg element to canvas 
                // $("#spiral_svg").attr("version", "1.1");
                // $("#spiral_svg").attr("xmlns", "http://www.w3.org/2000/svg");
                // $("#spiral_svg").attr("xmlns:xlink", "http://www.w3.org/1999/xlink");   
                // $("#spiral_svg").clone().appendTo("#temp_div");
                // var svg_data = $("#temp_div").html();
                // $("#temp_div").remove();
                // var c = document.getElementById("temp_canvas"),
                //     image = new Image();
                // image.src = 'data:image/svg+xml;base64,' + window.btoa(svg_data);
                // c.getContext("2d").drawImage(image,0,0,width,height);
                // var points_xy = get_radius(points_s);
                // $("#temp_canvas").remove();
                // drawPoints_s(svg, points_xy);
                // function: get partition index
                function group_time_spiral(num_of_group, eachGroup, d)
                {
                    for (var i = 0; i < num_of_group - 1; i++) 
                    {
                        if (d >= eachGroup * i && d < eachGroup * (i + 1)) {return i + 1;}
                    }
                    return num_of_group;
                }
                // function: hex-RGB conversion
                function hexToRGB (hex)
                {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? 
                    {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                    } : null;
                }
                // // function: get radius of each point
                // function get_radius(points) 
                // {
                //     var date_points = d3.nest()
                //                         .key(function (d) {return d.angle;})
                //                         .sortKeys(d3.ascending)
                //                         .entries(points);
                //     var points_xy = [];
                //            // console.log(date_points);
                //            get_color(date_points[50], points_xy);
                //             get_color(date_points[919], points_xy);
                //             get_color(date_points[544], points_xy);
                //             get_color(date_points[288], points_xy);
                //     // date_points.forEach(function (d, i)
                //     // {
                //     //  console.log(i)
                //     //  get_color(d, points_xy); 
                //     // })
                //     return points_xy;
                // }
                // // function: get color in canvas
                // function get_color(d, points_xy)
                // {
                //     // set up local patameters
                //     var angle = d.key,
                //         theta = angle * 2 * Math.PI,
                //         base_r = base_radius(angle),
                //         sin = Math.sin(theta),
                //         cos = Math.cos(theta),
                //         x = Math.floor(base_r * sin),
                //         y = - Math.floor(base_r * cos),
                //         current_color = {},
                //         layer = [],
                //         counter = colorpicker.length - 1,
                //         distance = [],
                //         values = d.values;
                //     // get the start point x,y coordinates
                //     current_color = c.getContext("2d").getImageData(x + total_radius, y + total_radius, 1, 1).data;
                //     while (!check_color(current_color, colorpicker[colorpicker.length - 1].color))
                //     {
                //         var next_point = next_pixel(x, y, angle);
                //         x = next_point[0];
                //         y = next_point[1];
                //         current_color = c.getContext("2d").getImageData(x + total_radius, y + total_radius, 1, 1).data;
                //     }
                //     layer.push([x,y]);
                //     // start check along the radial, get layer value
                //     while (counter != 0)
                //     {
                //         var next_point = next_pixel(x, y, angle);
                //         x = next_point[0];
                //         y = next_point[1];
                //         current_color = c.getContext("2d").getImageData(x + total_radius, y + total_radius, 1, 1).data;
                //         if (compare_color(current_color, colorpicker[counter].color, colorpicker[counter - 1].color))
                //         {
                //             layer.push([x,y]);
                //             counter --;
                //         }
                //     }
                //     for (var i = 0; i < layer.length - 1; i++) { distance.push([{x: 0, y: dis(layer[i], layer[i+1])}]); }
                //     var stack = d3.layout.stack()
                //     stack(distance);
                //     // console.log(distance);
                //     values.forEach(function (d)
                //     {
                //         var age = parseInt(d.age),
                //             index = disease_name.indexOf(d.disease);
                //         ageScale.range([base_r + distance[index][0].y0, base_r + distance[index][0].y + distance[index][0].y0]);
                //         d.radius = ageScale(age);
                //         points_xy.push(d);
                //     })

                // }
                // // function: check whether belongs to one color
                // function check_color(d, color)
                // {
                //     var diff = Math.pow((d[0] - color.r),2) + Math.pow((d[1] - color.g),2) + Math.pow((d[2] - color.b),2);
                //     if (diff > 50) { return false; } else {return true;}
                // }
                // // function: get next pixel x,y coordinates
                // function next_pixel(x, y, angle)
                // {
                //     var angle_n = angle * 360 % 360;
                //     // check whether it is on edges
                //     if (angle_n == 0 && angle != end) {return [0, y-1];}
                //     else if (angle_n == 90) {return [x+1, 0];}
                //     else if (angle_n == 180) {return [-1, y+1];}
                //     else if (angle_n == 270) {return [x-1, -1];}
                //     else if (angle_n == end) {return [-1, y-1];}
                //     // determine how to check along the line based on angle
                //     else if ((angle_n > 0 && angle_n <= 45) || (angle_n > 315 && angle_n < 360))
                //     {
                //         var tan = Math.tan(angle_n / 180 * Math.PI),
                //             next_y = y - 1,
                //             next_x = Math.floor(- tan * next_y);
                //         return [next_x, next_y];
                //     }
                //     else if (angle_n > 45 && angle_n <= 135 && angle_n != 90)
                //     {
                //         var tan = Math.tan(angle_n / 180 * Math.PI),
                //             next_x = x + 1,
                //             next_y = Math.floor(- next_x / tan);
                //         return [next_x, next_y];
                //     }
                //     else if (angle_n > 135 && angle_n <= 225 && angle_n != 180)
                //     {
                //         var tan = Math.tan(angle_n / 180 * Math.PI),
                //             next_y = y + 1,
                //             next_x = Math.floor(- tan * next_y);
                //         return [next_x, next_y];
                //     }
                //     else if (angle_n > 225 && angle_n <= 315 && angle_n != 270)
                //     {
                //         var tan = Math.tan(angle_n / 180 * Math.PI),
                //             next_x = x - 1,
                //             next_y = Math.floor(- next_x / tan);
                //         return [next_x, next_y];
                //     }
                // }
                // // function: compare color with two samples, equal to first one return false, equal to second one return true
                // function compare_color(d, color1, color2)
                // {
                //     if (d[0] == color1.r && d[1] == color1.g && d[2] == color1.b) { return false; }
                //     else 
                //     {
                //         var diff1 = Math.pow((d[0] - color1.r),2) + Math.pow((d[1] - color1.g),2) + Math.pow((d[2] - color1.b),2),
                //         diff2 = Math.pow((d[0] - color2.r),2) + Math.pow((d[1] - color2.g),2) + Math.pow((d[2] - color2.b),2);
                //         if (diff1 < diff2) { return false; } else { return true; }
                //     }
                // }
                // // function: calculate the distance
                // function dis(x1, x2) 
                // {
                //     return Math.sqrt(Math.pow(x1[0] - x2[0], 2) + Math.pow(x1[1] - x2[1], 2)); 
                // }
                // // function: draw points on stack
                // function drawPoints_s(svg, points)
                // {
                //     // set up local parameters
                //     var size = d3.min([width, height]) / 180,
                //         patient_points = d3.nest()
                //                         .key(function (d) {return d.patient_gid;})
                //                         .sortKeys(d3.ascending)
                //                         .entries(points),
                //         patient_gid_array = patient_points.map(function (d) {return d.key;}),
                //         cluster_points = [];
                //     // set up desired format for cluster layout
                //     for (var i = 0; i < patient_points.length; i ++)
                //     {
                //         for (var j = 0; j < patient_points[i].values.length; j ++)
                //         {
                //             var this_name = "all." + patient_points[i].values[j].group_number + "." + patient_points[i].key + "#" + j;
                //             if (j < patient_points[i].values.length - 1)
                //             {
                //                 var next_name = "all." + patient_points[i].values[j + 1].group_number + "." + patient_points[i].key + "#" + (j + 1);
                //                     cluster_points.push( {"name": this_name, "values": patient_points[i].values[j], "imports": [next_name]} );
                //             } else
                //             {
                //                 cluster_points.push({"name": this_name, "values": patient_points[i].values[j], "imports": []});
                //             }
                //         }
                //     }
                //     // set up generators and hierarchy architecture
                //     var cluster = d3.layout.cluster()
                //                     .size([360, total_radius])
                //                     .sort(null),
                //         bundle = d3.layout.bundle(),
                //         line_point = d3.svg.line.radial()
                //                 .interpolate("bundle")
                //                 .tension(tension_global)
                //                 .radius(function (d) {return d.y;})
                //                 .angle(function (d) {return d.x * 2 * Math.PI;}),
                //         nodes = cluster.nodes(packageHierarchy(cluster_points)),
                //         changeNodes = nodes.map(function (d)
                //         {
                //             if (!d.children)
                //             {
                //                 d.x = d.values.angle; d.y = d.values.radius; return d;
                //             }else if (d.depth == 2)
                //             {
                //                 var elapsed_g = (parseInt(d.key) + 0.5) * eachGroup,
                //                     a = elapsedScale_s(elapsed_g),
                //                     r = base_radius(a);
                //                 d.x = a; d.y = r; return d;
                //             }else {d.x = 0; d.y = 0; return d;}
                //         }),
                //         links = packageImports(changeNodes);
                //             // console.log(changeNodes);
                //             // console.log(links);
                //             // console.log(bundle(links));
                //     // draw links first
                //     var linkpath = svg.selectAll(".link")
                //                     .data(bundle(links))
                //                     .enter()
                //                     .append("path")
                //                     .each(function (d) {d.source = d[0], d.target = d[d.length - 1];})
                //                     .attr("class", "link")
                //                     .attr("d", line_point);
                //     // draw individual point
                //     var shapes = changeNodes.filter(function (n) {return !n.children;}),
                //         female = shapes.filter(function (d) {if (d.values.gender === "F") {return d;}}),
                //         male = shapes.filter(function (d) {if (d.values.gender === "M") {return d;}});
                //     var circleF = svg.append("g")
                //                 .selectAll("circle")
                //                 .data(female)
                //                 .enter()
                //                 .append("circle")
                //                 .attr("cx", function (d) {return Math.sin(d.x * 2 * Math.PI) * d.y;})
                //                 .attr("cy", function (d) {return - Math.cos(d.x * 2 * Math.PI) * d.y;})
                //                 .attr("r", size / 2)
                //                 .attr("fill", function (d) {return getColor(races.indexOf(d.values.race));})
                //                 .attr("stroke-width", 0)
                //                 .on("mouseover", function (d) {mouseovered(d, circleF);})
                //                 .on("mouseout", function (d) {mouseouted(d, circleF)});
                //     var rectM = svg.append("g")
                //                 .selectAll("rect")
                //                 .data(male)
                //                 .enter()
                //                 .append("rect")
                //                 .attr("x", function (d) {return Math.sin(d.x * 2 * Math.PI) * d.y;})
                //                 .attr("y", function (d) {return - Math.cos(d.x * 2* Math.PI) * d.y;})
                //                 .attr("width", size)
                //                 .attr("height", size)
                //                 .attr("fill", function (d) {return getColor(races.indexOf(d.values.race));})
                //                 .attr("stroke-width", 0)
                //                 .on("mouseover", function (d) {mouseovered(d, rectM);})
                //                 .on("mouseout", function (d) {mouseouted(d, rectM);});
                //     // set up tooltip
                //     var tooltip = d3.tip()
                //         .attr("class", "d3-tip")
                //         .offset([-10, 0])
                //         .html(function (d) 
                //         {
                //             return "<div style='z-index: 9999;'>\
                //                     <div style='opacity: 0.85'>Disease: " + d.values.disease + "</div>\
                //                     <div style='opacity: 0.85'>Gender: " + d.values.gender + "</div>\
                //                     <div style='opacity: 0.85'>Race: " + d.values.race + "</div>\
                //                     <div style='opacity: 0.85'>Age: " + d.values.age + "</div>\
                //                     <div style='opacity: 0.85'>Date: " + d.values.date + "</div>\
                //                     </div>";
                //         });
                //     svg.call(tooltip);
                //     // set up mouseover and mouseout function for highlight
                //     function mouseovered(d, draw) 
                //     {
                //         tooltip.show(d);
                //         draw.each(function (n) {n.highlight = false;});
                //         var patient_gid = d.key.substring(0, i = d.key.lastIndexOf("#")),
                //             occurrence_times  = patient_points[patient_gid_array.indexOf(patient_gid)].values.length,
                //             occurrence_names = [];
                //         if (occurrence_times > 1) {
                //             for (var j = 0; j < occurrence_times - 1; j++) {
                //             var name = d.key.substring(0, i = d.key.lastIndexOf("#") + 1) + j.toString();
                //                 occurrence_names.push(name);
                //             }
                //             linkpath.classed("link_highlight", function (l) {
                //                 var index = occurrence_names.indexOf(l.source.key);
                //                 if (index == 0) {return l.source.highlight = l.target.highlight = true;}
                //                 else if (index != 0 && index != -1) {return l.target.highlight = true;}
                //             });
                //         }
                //         draw.classed("node_highlight", function (n) {return n.highlight;})
                //     }
                //     function mouseouted(d, draw) 
                //     {
                //         tooltip.hide(d);
                //         linkpath.classed("link_highlight", false);
                //         draw.classed("node_highlight", false)
                //     }
                // }



















            }

        }
    };
}
