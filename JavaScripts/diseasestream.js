function DiseaseStream() {
    return {
        id: 'diseasestream',
        title: 'Theme River',
        url: '/disease_counts_by_year',
        container: "#diseaseStreamChart",
        dssvg: null,
        jsonData: null,

        getOptions: function() {
            return '' +
                '<p><label><input type="radio" name="group1" id="area"checked/>Area</label></p>' +
                '<p><label><input type="radio" name="group1" id="stacked"/>Stacked Area</label></p>' +
                '<p><label><input type="radio" name="group1" id="stream"/>Stream Graph</label></p>' +
                '<p><label><input type="radio" name="group1" id="theme"/>Theme River</label></p>' +

                '';
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
                '<span class="glyphicon glyphicon-eye-open"></span>Theme River' + '<br>' + t +
                '</div>' + '<div class="save-body"><canvas id="Canvas' + currentOrder + '"></canvas></div>' + '';

        },

        onLoadsave: function() {
            var currentOrder = visualizations.savedFigures.length - 1;

            // draw svg on canvas
            var CanvasID = "Canvas" + currentOrder.toString();
            var svg = document.getElementById("diseaseStreamChart").childNodes[1];
            var currentCanvas = document.getElementById(CanvasID);

            // draw ul on canvas
            
            var html = document.getElementById("diseaseStreamChart").childNodes[2];
            console.log(Math.floor(html.childNodes.length / 2) + html.childNodes.length % 2);
            var numbDis = html.childNodes.length;
            if (numbDis <= 8) {
                visualizations.svgToCanvas(svg, currentCanvas, 0, 10, 200, 100);
                var length = Math.floor(numbDis / 2) + numbDis % 2;
                var height = length * 10;
                html2canvas(html, {
                    onrendered: function(canvas) {
                        currentCanvas.getContext("2d").drawImage(Canvas2Image.convertToImage(canvas), 0, 110, 200, height);
                    }
                });
            } else {
                visualizations.svgToCanvas(svg, currentCanvas, 0, 15, 200, 120);
            }

            // set variables for enabling buttons
            var displayButton = '#listOfSavedFigures .save-header button[id="Display' + currentOrder + '"]';
            var deleteButton = '#listOfSavedFigures .save-header button[id="Removed' + currentOrder + '"]';

            // set up the display button
            $(displayButton).on('click', function() {
                var idstring = $(this).attr("id");
                var orderInt = parseInt(idstring.substr(idstring.length - 1, 1));
                var temp = visualizations.themeRiver;
                visualizations.get("diseasestream").getAndRender(visualizations.savedFigures[orderInt]);
                visualizations.themeRiver = visualizations.savedFigures[orderInt];
                visualizations.savedFigures[orderInt] = temp;
            });

            // set the remove button
            $(deleteButton).on('click', function() {
                var idstring = $(this).attr("id");
                var orderInt = parseInt(idstring.substr(idstring.length - 1, 1));
                $(this).parent("div").parent("li").remove();
                visualizations.savedFigures.splice(orderInt, 1);
                visualizations.changeID(orderInt);
            })
        },

        getAndRender: function(filters) {
            // build custom data fields

            // add filters

            // use local variable to reference draw method inside ajax callback
            var callback = this.draw;

            $.ajax({
                accepts: 'json',
                url: this.url,
                data: filters,
                success: function(data, textStatus, jqXHR) {
                    callback(data);
                    loadingGraphic.hide();
                }
            });
        },

        draw: function(data) {



            if ($("#stream").is(':checked')) {



                //             var m = [20, 20, 30, 20],
                // w = 960 - m[1] - m[3],
                // h = 500 - m[0] - m[2];


                var margin = {
                    top: 20,
                    right: 75,
                    bottom: 20,
                    left: 75
                };
                var width = $('#diseaseStreamChart').parent().width() - margin.left - margin.right;
                var height = $('#diseaseStreamChart').parent().height() - margin.top - margin.bottom;



                var x,
                    y,
                    duration = 1,
                    delay = 1;

                var graph = 0;

                var color = d3.scale.category10();

                $('#diseaseStreamChart' + " svg").remove();
                $('#diseaseStreamChart' + " ul").remove();

                var svg = d3.select("#diseaseStreamChart").append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                var stocks,
                    symbols;

                // A line generator, for the dark stroke.
                var line = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y(function(d) {
                        return y(d.value);
                    });

                // A line generator, for the dark stroke.
                var axis = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y(height);

                // A area generator, for the dark stroke.
                var area = d3.svg.area()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y1(function(d) {
                        return y(d.value);
                    });


                this.jsonData = data;
                var parse = d3.time.format("%Y").parse;

                // Nest stock values by symbol.
                symbols = d3.nest()
                    .key(function(d) {
                        return d.key;
                    })
                    .entries(stocks = data);

                // Parse dates and numbers. We assume values are sorted by date.
                // Also compute the maximum price per symbol, needed for the y-domain.
                symbols.forEach(function(s) {
                    s.values.forEach(function(d) {
                        d.date = parse(d.date);
                        d.value = +d.value;
                    });
                    s.maxPrice = d3.max(s.values, function(d) {
                        return d.value;
                    });
                    s.sumPrice = d3.sum(s.values, function(d) {
                        return d.value;
                    });
                });

                //console.log(data);

                // Sort by maximum price, descending.
                symbols.sort(function(a, b) {
                    return b.maxPrice - a.maxPrice;
                });

                var g = svg.selectAll("g")
                    .data(symbols)
                    .enter().append("g")
                    .attr("class", "symbol");

                setTimeout(lines_3, duration + 50);




                function lines_3() {
                    console.log("2");
                    graph = 1;
                    x = d3.time.scale().range([0, width - 60]);
                    y = d3.scale.linear().range([height / 4 - 20, 0]);

                    // Compute the minimum and maximum date across symbols.
                    x.domain([
                        d3.min(symbols, function(d) {
                            return d.values[0].date;
                        }),
                        d3.max(symbols, function(d) {
                            return d.values[d.values.length - 1].date;
                        })
                    ]);

                    var g = svg.selectAll(".symbol")
                        .attr("transform", function(d, i) {
                            return "translate(0," + (i * height / 4 + 10) + ")";
                        });

                    g.each(function(d) {
                        var e = d3.select(this);

                        e.append("path")
                            .attr("class", "line");

                        e.append("circle")
                            .attr("r", 5)
                            .style("fill", function(d) {
                                return color(d.key);
                            })
                            .style("stroke", "#000")
                            .style("stroke-width", "2px");

                        e.append("text")
                            .attr("x", 12)
                            .attr("dy", ".31em")
                            .text(d.key);
                    });



                    function draw(k) {
                        g.each(function(d) {
                            var e = d3.select(this);
                            y.domain([0, d.maxPrice]);

                            e.select("path")
                                .attr("d", function(d) {
                                    return line(d.values.slice(0, k + 1));
                                });

                            e.selectAll("circle, text")
                                .data(function(d) {
                                    return [d.values[k], d.values[k]];
                                })
                                .attr("transform", function(d) {
                                    return "translate(" + x(d.date) + "," + y(d.value) + ")";
                                });
                        });
                    }

                    var k = 1,
                        n = symbols[0].values.length;
                    d3.timer(function() {
                        draw(k);
                        if ((k += 1002) >= n - 1) {
                            draw(n - 1);
                            setTimeout(horizons_3, 10);
                            return true;
                        }
                    });
                }

                function horizons_3() {

                    console.log("Horizon");

                    group = 2;
                    svg.insert("defs", ".symbol")
                        .append("clipPath")
                        .attr("id", "clip")
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height / 4 - 20);

                    var color = d3.scale.ordinal()
                        .range(["#c6dbef", "#9ecae1", "#6baed6"]);

                    var g = svg.selectAll(".symbol")
                        .attr("clip-path", "url(#clip)");

                    area
                        .y0(height / 4 - 20);

                    g.select("circle").transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + (width - 60) + "," + (-height / 4) + ")";
                        })
                        .remove();

                    g.select("text").transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + (width - 60) + "," + (height / 4 - 20) + ")";
                        })
                        .attr("dy", "0em");

                    g.each(function(d) {
                        y.domain([0, d.maxPrice]);

                        d3.select(this).selectAll(".area")
                            .data(d3.range(3))
                            .enter().insert("path", ".line")
                            .attr("class", "area")
                            .attr("transform", function(d) {
                                return "translate(0," + (d * (height / 4 - 20)) + ")";
                            })
                            .attr("d", area(d.values))
                            .style("fill", function(d, i) {
                                return color(i);
                            })
                            .style("fill-opacity", 1e-6);

                        y.domain([0, d.maxPrice / 3]);

                        d3.select(this).selectAll(".line").transition()
                            .duration(duration)
                            .attr("d", line(d.values))
                            .style("stroke-opacity", 1e-6);

                        d3.select(this).selectAll(".area").transition()
                            .duration(duration)
                            .style("fill-opacity", 1)
                            .attr("d", area(d.values))
                            .each("end", function() {
                                d3.select(this).style("fill-opacity", null);
                            });
                    });

                    setTimeout(areas_3, duration + delay + 100);
                }

                function areas_3() {

                    graph = 3;
                    var g = svg.selectAll(".symbol");

                    axis
                        .y(height / 4 - 21);

                    g.select(".line")
                        .attr("d", function(d) {
                            return axis(d.values);
                        });

                    g.each(function(d) {
                        y.domain([0, d.maxPrice]);

                        d3.select(this).select(".line").transition()
                            .duration(duration)
                            .style("stroke-opacity", 1)
                            .each("end", function() {
                                d3.select(this).style("stroke-opacity", null);
                            });

                        d3.select(this).selectAll(".area")
                            .filter(function(d, i) {
                                return i;
                            })
                            .transition()
                            .duration(duration)
                            .style("fill-opacity", 1e-6)
                            .attr("d", area(d.values))
                            .remove();

                        d3.select(this).selectAll(".area")
                            .filter(function(d, i) {
                                return !i;
                            })
                            .transition()
                            .duration(duration)
                            .style("fill", color(d.key))
                            .attr("d", area(d.values));
                    });

                    svg.select("defs").transition()
                        .duration(duration)
                        .remove();

                    g.transition()
                        .duration(duration)
                        .each("end", function() {
                            d3.select(this).attr("clip-path", null);
                        });



                    setTimeout(stackedArea_3, duration + delay + 200);

                }

                function stackedArea_3() {

                    console.log("Stack");
                    graph = 4;
                    var stack = d3.layout.stack()
                        .values(function(d) {
                            return d.values;
                        })
                        .x(function(d) {
                            return d.date;
                        })
                        .y(function(d) {
                            return d.value;
                        })
                        .out(function(d, y0, y) {
                            d.price0 = y0;
                        })
                        .order("reverse");

                    stack(symbols);

                    y.domain([0, d3.max(symbols[0].values.map(function(d) {
                            return d.value + d.price0;
                        }))])
                        .range([height, 0]);

                    line.y(function(d) {
                        return y(d.price0);
                    });

                    area
                        .y0(function(d) {
                            return y(d.price0);
                        })
                        .y1(function(d) {
                            return y(d.price0 + d.value);
                        });

                    var t = svg.selectAll(".symbol").transition()
                        .duration(duration)
                        .attr("transform", "translate(0,0)")
                        .each("end", function() {
                            d3.select(this).attr("transform", null);
                        });

                    t.select("path.area")
                        .attr("d", function(d) {
                            return area(d.values);
                        });

                    t.select("path.line")
                        .style("stroke-opacity", function(d, i) {
                            return i < 3 ? 1e-6 : 1;
                        })
                        .attr("d", function(d) {
                            return line(d.values);
                        });

                    t.select("text")
                        .attr("transform", function(d) {
                            d = d.values[d.values.length - 1];
                            return "translate(" + (width - 60) + "," + y(d.value / 2 + d.price0) + ")";
                        });

                    setTimeout(streamgraph_3, duration + delay + 130);
                }

                function streamgraph_3() {

                    graph = 5;
                    var stack = d3.layout.stack()
                        .values(function(d) {
                            return d.values;
                        })
                        .x(function(d) {
                            return d.date;
                        })
                        .y(function(d) {
                            return d.value;
                        })
                        .out(function(d, y0, y) {
                            d.price0 = y0;
                        })
                        .order("reverse")
                        .offset("wiggle");

                    stack(symbols);

                    line
                        .y(function(d) {
                            return y(d.price0);
                        });

                    var t = svg.selectAll(".symbol").transition()
                        .duration(duration);

                    t.select("path.area")
                        .attr("d", function(d) {
                            return area(d.values);
                        });

                    t.select("path.line")
                        .style("stroke-opacity", 1e-6)
                        .attr("d", function(d) {
                            return line(d.values);
                        });

                    t.select("text")
                        .attr("transform", function(d) {
                            d = d.values[d.values.length - 1];
                            return "translate(" + (width - 60) + "," + y(d.value / 2 + d.price0) + ")";
                        });

                    //setTimeout(overlappingArea, duration + delay);
                }

            }




            //console.log(data);

            if ($("#stacked").is(':checked')) {

                console.log("BOB");

                //             var m = [20, 20, 30, 20],
                // w = 960 - m[1] - m[3],
                // h = 500 - m[0] - m[2];


                var margin = {
                    top: 20,
                    right: 75,
                    bottom: 20,
                    left: 75
                };
                var width = $('#diseaseStreamChart').parent().width() - margin.left - margin.right;
                var height = $('#diseaseStreamChart').parent().height() - margin.top - margin.bottom;



                var x,
                    y,
                    duration = 1,
                    delay = 1;

                var graph = 0;

                var color = d3.scale.category10();

                $('#diseaseStreamChart' + " svg").remove();
                $('#diseaseStreamChart' + " ul").remove();

                var svg = d3.select("#diseaseStreamChart").append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                var stocks,
                    symbols;

                // A line generator, for the dark stroke.
                var line = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y(function(d) {
                        return y(d.value);
                    });

                // A line generator, for the dark stroke.
                var axis = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y(height);

                // A area generator, for the dark stroke.
                var area = d3.svg.area()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y1(function(d) {
                        return y(d.value);
                    });


                this.jsonData = data;
                var parse = d3.time.format("%Y").parse;

                // Nest stock values by symbol.
                symbols = d3.nest()
                    .key(function(d) {
                        return d.key;
                    })
                    .entries(stocks = data);

                // Parse dates and numbers. We assume values are sorted by date.
                // Also compute the maximum price per symbol, needed for the y-domain.
                symbols.forEach(function(s) {
                    s.values.forEach(function(d) {
                        d.date = parse(d.date);
                        d.value = +d.value;
                    });
                    s.maxPrice = d3.max(s.values, function(d) {
                        return d.value;
                    });
                    s.sumPrice = d3.sum(s.values, function(d) {
                        return d.value;
                    });
                });

                //console.log(data);

                // Sort by maximum price, descending.
                symbols.sort(function(a, b) {
                    return b.maxPrice - a.maxPrice;
                });

                var g = svg.selectAll("g")
                    .data(symbols)
                    .enter().append("g")
                    .attr("class", "symbol");

                setTimeout(lines_1, duration + 50);




                function lines_1() {
                    console.log("2");
                    graph = 1;
                    x = d3.time.scale().range([0, width - 60]);
                    y = d3.scale.linear().range([height / 4 - 20, 0]);

                    // Compute the minimum and maximum date across symbols.
                    x.domain([
                        d3.min(symbols, function(d) {
                            return d.values[0].date;
                        }),
                        d3.max(symbols, function(d) {
                            return d.values[d.values.length - 1].date;
                        })
                    ]);

                    var g = svg.selectAll(".symbol")
                        .attr("transform", function(d, i) {
                            return "translate(0," + (i * height / 4 + 10) + ")";
                        });

                    g.each(function(d) {
                        var e = d3.select(this);

                        e.append("path")
                            .attr("class", "line");

                        e.append("circle")
                            .attr("r", 5)
                            .style("fill", function(d) {
                                return color(d.key);
                            })
                            .style("stroke", "#000")
                            .style("stroke-width", "2px");

                        e.append("text")
                            .attr("x", 12)
                            .attr("dy", ".31em")
                            .text(d.key);
                    });



                    function draw(k) {
                        g.each(function(d) {
                            var e = d3.select(this);
                            y.domain([0, d.maxPrice]);

                            e.select("path")
                                .attr("d", function(d) {
                                    return line(d.values.slice(0, k + 1));
                                });

                            e.selectAll("circle, text")
                                .data(function(d) {
                                    return [d.values[k], d.values[k]];
                                })
                                .attr("transform", function(d) {
                                    return "translate(" + x(d.date) + "," + y(d.value) + ")";
                                });
                        });
                    }

                    var k = 1,
                        n = symbols[0].values.length;
                    d3.timer(function() {
                        draw(k);
                        if ((k += 1002) >= n - 1) {
                            draw(n - 1);
                            setTimeout(horizons_1, 10);
                            return true;
                        }
                    });
                }

                function horizons_1() {

                    console.log("Horizon");

                    group = 2;
                    svg.insert("defs", ".symbol")
                        .append("clipPath")
                        .attr("id", "clip")
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height / 4 - 20);

                    var color = d3.scale.ordinal()
                        .range(["#c6dbef", "#9ecae1", "#6baed6"]);

                    var g = svg.selectAll(".symbol")
                        .attr("clip-path", "url(#clip)");

                    area
                        .y0(height / 4 - 20);

                    g.select("circle").transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + (width - 60) + "," + (-height / 4) + ")";
                        })
                        .remove();

                    g.select("text").transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + (width - 60) + "," + (height / 4 - 20) + ")";
                        })
                        .attr("dy", "0em");

                    g.each(function(d) {
                        y.domain([0, d.maxPrice]);

                        d3.select(this).selectAll(".area")
                            .data(d3.range(3))
                            .enter().insert("path", ".line")
                            .attr("class", "area")
                            .attr("transform", function(d) {
                                return "translate(0," + (d * (height / 4 - 20)) + ")";
                            })
                            .attr("d", area(d.values))
                            .style("fill", function(d, i) {
                                return color(i);
                            })
                            .style("fill-opacity", 1e-6);

                        y.domain([0, d.maxPrice / 3]);

                        d3.select(this).selectAll(".line").transition()
                            .duration(duration)
                            .attr("d", line(d.values))
                            .style("stroke-opacity", 1e-6);

                        d3.select(this).selectAll(".area").transition()
                            .duration(duration)
                            .style("fill-opacity", 1)
                            .attr("d", area(d.values))
                            .each("end", function() {
                                d3.select(this).style("fill-opacity", null);
                            });
                    });

                    setTimeout(areas_1, duration + delay + 100);
                }

                function areas_1() {

                    graph = 3;
                    var g = svg.selectAll(".symbol");

                    axis
                        .y(height / 4 - 21);

                    g.select(".line")
                        .attr("d", function(d) {
                            return axis(d.values);
                        });

                    g.each(function(d) {
                        y.domain([0, d.maxPrice]);

                        d3.select(this).select(".line").transition()
                            .duration(duration)
                            .style("stroke-opacity", 1)
                            .each("end", function() {
                                d3.select(this).style("stroke-opacity", null);
                            });

                        d3.select(this).selectAll(".area")
                            .filter(function(d, i) {
                                return i;
                            })
                            .transition()
                            .duration(duration)
                            .style("fill-opacity", 1e-6)
                            .attr("d", area(d.values))
                            .remove();

                        d3.select(this).selectAll(".area")
                            .filter(function(d, i) {
                                return !i;
                            })
                            .transition()
                            .duration(duration)
                            .style("fill", color(d.key))
                            .attr("d", area(d.values));
                    });

                    svg.select("defs").transition()
                        .duration(duration)
                        .remove();

                    g.transition()
                        .duration(duration)
                        .each("end", function() {
                            d3.select(this).attr("clip-path", null);
                        });



                    setTimeout(stackedArea_1, duration + delay + 200);

                }

                function stackedArea_1() {

                    console.log("Stack");
                    graph = 4;
                    var stack = d3.layout.stack()
                        .values(function(d) {
                            return d.values;
                        })
                        .x(function(d) {
                            return d.date;
                        })
                        .y(function(d) {
                            return d.value;
                        })
                        .out(function(d, y0, y) {
                            d.price0 = y0;
                        })
                        .order("reverse");

                    stack(symbols);

                    y.domain([0, d3.max(symbols[0].values.map(function(d) {
                            return d.value + d.price0;
                        }))])
                        .range([height, 0]);

                    line.y(function(d) {
                        return y(d.price0);
                    });

                    area
                        .y0(function(d) {
                            return y(d.price0);
                        })
                        .y1(function(d) {
                            return y(d.price0 + d.value);
                        });

                    var t = svg.selectAll(".symbol").transition()
                        .duration(duration)
                        .attr("transform", "translate(0,0)")
                        .each("end", function() {
                            d3.select(this).attr("transform", null);
                        });

                    t.select("path.area")
                        .attr("d", function(d) {
                            return area(d.values);
                        });

                    t.select("path.line")
                        .style("stroke-opacity", function(d, i) {
                            return i < 3 ? 1e-6 : 1;
                        })
                        .attr("d", function(d) {
                            return line(d.values);
                        });

                    t.select("text")
                        .attr("transform", function(d) {
                            d = d.values[d.values.length - 1];
                            return "translate(" + (width - 60) + "," + y(d.value / 2 + d.price0) + ")";
                        });

                    //setTimeout(streamgraph, duration + delay);
                }

            }





            if ($("#area").is(':checked')) {

                //             var m = [20, 20, 30, 20],
                // w = 960 - m[1] - m[3],
                // h = 500 - m[0] - m[2];



                var margin = {
                    top: 20,
                    right: 75,
                    bottom: 20,
                    left: 75
                };
                var width = $('#diseaseStreamChart').parent().width() - margin.left - margin.right;
                var height = $('#diseaseStreamChart').parent().height() - margin.top - margin.bottom;



                var x,
                    y,
                    duration = 1,
                    delay = 1;

                var graph = 0;

                var color = d3.scale.category10();

                $('#diseaseStreamChart' + " svg").remove();
                $('#diseaseStreamChart' + " ul").remove();

                var svg = d3.select("#diseaseStreamChart").append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                var stocks,
                    symbols;

                // A line generator, for the dark stroke.
                var line = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y(function(d) {
                        return y(d.value);
                    });

                // A line generator, for the dark stroke.
                var axis = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y(height);

                // A area generator, for the dark stroke.
                var area = d3.svg.area()
                    .interpolate("basis")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y1(function(d) {
                        return y(d.value);
                    });


                this.jsonData = data;
                var parse = d3.time.format("%Y").parse;

                // Nest stock values by symbol.
                symbols = d3.nest()
                    .key(function(d) {
                        return d.key;
                    })
                    .entries(stocks = data);

                // Parse dates and numbers. We assume values are sorted by date.
                // Also compute the maximum price per symbol, needed for the y-domain.
                symbols.forEach(function(s) {
                    s.values.forEach(function(d) {
                        d.date = parse(d.date);
                        d.value = +d.value;
                    });
                    s.maxPrice = d3.max(s.values, function(d) {
                        return d.value;
                    });
                    s.sumPrice = d3.sum(s.values, function(d) {
                        return d.value;
                    });
                });

                //console.log(data);

                // Sort by maximum price, descending.
                symbols.sort(function(a, b) {
                    return b.maxPrice - a.maxPrice;
                });

                var g = svg.selectAll("g")
                    .data(symbols)
                    .enter().append("g")
                    .attr("class", "symbol");

                setTimeout(lines, duration);


                function lines() {
                    console.log('3');
                    graph = 1;
                    x = d3.time.scale().range([0, width - 60]);
                    y = d3.scale.linear().range([height / 4 - 20, 0]);

                    // Compute the minimum and maximum date across symbols.
                    x.domain([
                        d3.min(symbols, function(d) {
                            return d.values[0].date;
                        }),
                        d3.max(symbols, function(d) {
                            return d.values[d.values.length - 1].date;
                        })
                    ]);

                    var g = svg.selectAll(".symbol")
                        .attr("transform", function(d, i) {
                            return "translate(0," + (i * height / 4 + 10) + ")";
                        });

                    g.each(function(d) {
                        var e = d3.select(this);

                        e.append("path")
                            .attr("class", "line");

                        e.append("circle")
                            .attr("r", 5)
                            .style("fill", function(d) {
                                return color(d.key);
                            })
                            .style("stroke", "#000")
                            .style("stroke-width", "2px");

                        e.append("text")
                            .attr("x", 12)
                            .attr("dy", ".31em")
                            .text(d.key);
                    });

                    function draw(k) {
                        g.each(function(d) {
                            var e = d3.select(this);
                            y.domain([0, d.maxPrice]);

                            e.select("path")
                                .attr("d", function(d) {
                                    return line(d.values.slice(0, k + 1));
                                });

                            e.selectAll("circle, text")
                                .data(function(d) {
                                    return [d.values[k], d.values[k]];
                                })
                                .attr("transform", function(d) {
                                    return "translate(" + x(d.date) + "," + y(d.value) + ")";
                                });
                        });
                    }

                    var k = 1,
                        n = symbols[0].values.length;
                    d3.timer(function() {
                        draw(k);
                        if ((k += 1002) >= n - 1) {
                            draw(n - 1);
                            setTimeout(horizons, 10);
                            return true;
                        }
                    });
                }

                function horizons() {
                    group = 2;
                    svg.insert("defs", ".symbol")
                        .append("clipPath")
                        .attr("id", "clip")
                        .append("rect")
                        .attr("width", width)
                        .attr("height", height / 4 - 20);

                    var color = d3.scale.ordinal()
                        .range(["#c6dbef", "#9ecae1", "#6baed6"]);

                    var g = svg.selectAll(".symbol")
                        .attr("clip-path", "url(#clip)");

                    area
                        .y0(height / 4 - 20);

                    g.select("circle").transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + (width - 60) + "," + (-height / 4) + ")";
                        })
                        .remove();

                    g.select("text").transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + (width - 60) + "," + (height / 4 - 20) + ")";
                        })
                        .attr("dy", "0em");

                    g.each(function(d) {
                        y.domain([0, d.maxPrice]);

                        d3.select(this).selectAll(".area")
                            .data(d3.range(3))
                            .enter().insert("path", ".line")
                            .attr("class", "area")
                            .attr("transform", function(d) {
                                return "translate(0," + (d * (height / 4 - 20)) + ")";
                            })
                            .attr("d", area(d.values))
                            .style("fill", function(d, i) {
                                return color(i);
                            })
                            .style("fill-opacity", 1e-6);

                        y.domain([0, d.maxPrice / 3]);

                        d3.select(this).selectAll(".line").transition()
                            .duration(duration)
                            .attr("d", line(d.values))
                            .style("stroke-opacity", 1e-6);

                        d3.select(this).selectAll(".area").transition()
                            .duration(duration)
                            .style("fill-opacity", 1)
                            .attr("d", area(d.values))
                            .each("end", function() {
                                d3.select(this).style("fill-opacity", null);
                            });
                    });

                    setTimeout(areas, duration + delay + 30);
                }

                function areas() {

                    graph = 3;
                    var g = svg.selectAll(".symbol");

                    axis
                        .y(height / 4 - 21);

                    g.select(".line")
                        .attr("d", function(d) {
                            return axis(d.values);
                        });

                    g.each(function(d) {
                        y.domain([0, d.maxPrice]);

                        d3.select(this).select(".line").transition()
                            .duration(duration)
                            .style("stroke-opacity", 1)
                            .each("end", function() {
                                d3.select(this).style("stroke-opacity", null);
                            });

                        d3.select(this).selectAll(".area")
                            .filter(function(d, i) {
                                return i;
                            })
                            .transition()
                            .duration(duration)
                            .style("fill-opacity", 1e-6)
                            .attr("d", area(d.values))
                            .remove();

                        d3.select(this).selectAll(".area")
                            .filter(function(d, i) {
                                return !i;
                            })
                            .transition()
                            .duration(duration)
                            .style("fill", color(d.key))
                            .attr("d", area(d.values));
                    });

                    svg.select("defs").transition()
                        .duration(duration)
                        .remove();

                    g.transition()
                        .duration(duration)
                        .each("end", function() {
                            d3.select(this).attr("clip-path", null);
                        });

                    //setTimeout(stackedArea, duration + delay);
                }

            }


            if ($("#theme").is(':checked')) {

                this.jsonData = data;
                var format = d3.time.format("%Y");

                // update dates and values, and pull out min and max dates
                var minDate = null,
                    maxDate = null;
                this.jsonData.forEach(function(d) {
                    d.value = +d.value;
                    d.date = format.parse(d.date);
                    if (minDate == null || d.date < minDate) {
                        minDate = d.date;
                    }
                    if (maxDate == null || d.date > maxDate) {
                        maxDate = d.date;
                    }
                });

                var margin = {
                    top: 20,
                    right: 75,
                    bottom: 20,
                    left: 75
                };
                var width = $('#diseaseStreamChart').parent().width() - margin.left - margin.right;
                var height = $('#diseaseStreamChart').parent().height() - margin.top - margin.bottom;

                var tooltip = d3.select("body")
                    .append("div")
                    .attr("class", "remove")
                    .style("position", "absolute")
                    .style("z-index", "999")
                    .style("visibility", "hidden")
                    .style("top", "100px")
                    .style("left", "55px");

                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height - 10, 0]);

                var numYears = maxDate.getFullYear() - minDate.getFullYear();
                var tickGap = numYears > 15 ? Math.ceil(numYears / 20) : 1;

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(d3.time.years, tickGap);

                var yAxis = d3.svg.axis()
                    .scale(y);

                var yAxisr = d3.svg.axis()
                    .scale(y);

                var stack = d3.layout.stack()
                    .offset("silhouette")
                    .values(function(d) {
                        return d.values;
                    })
                    .x(function(d) {
                        return d.date;
                    })
                    .y(function(d) {
                        return d.value;
                    });

                var nest = d3.nest()
                    .key(function(d) {
                        return d.key;
                    });

                var area = d3.svg.area()
                    .interpolate("cardinal")
                    .x(function(d) {
                        return x(d.date);
                    })
                    .y0(function(d) {
                        return y(d.y0);
                    })
                    .y1(function(d) {
                        return y(d.y0 + d.y);
                    });

                $('#diseaseStreamChart' + " svg").remove();
                $('#diseaseStreamChart' + " ul").remove();

                this.dssvg = d3.select('#diseaseStreamChart').append("svg")
                    .attr("class", "diseaseStream")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var layers = stack(nest.entries(this.jsonData));

                x.domain(d3.extent(this.jsonData, function(d) {
                    return d.date;
                }));
                y.domain([0, d3.max(this.jsonData, function(d) {
                    return d.y0 + d.y;
                })]);

                //    var z = d3.scale.category20c();
                var z = d3.scale.linear()
                    .domain([0, layers.length / 3, 2 * (layers.length / 3), layers.length])
                    .interpolate(d3.interpolateRgb)
                    .range(["#C73D37", "#F59137", "#199F21", "#256B9F"]);

                this.dssvg.selectAll(".layer")
                    .data(layers)
                    .enter().append("path")
                    .attr("class", "layer")
                    .attr("series", function(d) {
                        return d.key;
                    })
                    .attr("d", function(d) {
                        return area(d.values);
                    })
                    .style("fill", function(d, i) {
                        return z(i);
                    });

                this.dssvg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                this.dssvg.append("g")
                    .attr("class", "y axis")
                    .attr("transform", "translate(" + width + ", 0)")
                    .call(yAxis.orient("right"));

                this.dssvg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis.orient("left"));

                this.dssvg.selectAll(".layer")
                    .attr("opacity", 1)
                    .style("stroke-width", 0)
                    .on("mouseover", function(d, i) {})
                    .on("mousemove", function(d, i) {
                        transitionIn(this);
                    })
                    .on("mouseout", function(d, i) {
                        transitionOut(z);
                    });

                d3.select('#diseaseStreamChart').append("ul")
                    .attr("class", "legend")
                    .selectAll(".entry")
                    .data(layers)
                    .enter().append("li")
                    .attr("class", "entry shown")
                    .style("background-color", function(d, i) {
                        return z(i);
                    })
                    .attr("series", function(d) {
                        return d.key;
                    })
                    .text(function(d) {
                        return d.key;
                    })
                    .attr("opacity", 1)
                    .on("mouseover", function(d, i) {})
                    .on("mousemove", function(d, i) {
                        transitionIn(this);
                    })
                    .on("mouseout", function(d, i) {
                        transitionOut(z);
                    });

                //console.log(data);

                this.lastRender = new Date();

                function transitionIn(el) {

                    TRANSITION_DURATION = 75;
                    HIGHLIGHT_COLOR = "#FF4";

                    var series = d3.select(el).attr("series");
                    d3.select(".entry[series='" + series + "']")
                        .classed("hover", true)
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .style("background-color", HIGHLIGHT_COLOR);
                    d3.select(".layer[series='" + series + "']")
                        .classed("hover", true)
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .style("stroke-width", 1)
                        .style("fill", HIGHLIGHT_COLOR);
                }

                function transitionOut(z) {
                    d3.selectAll(".entry")
                        .classed("hover", false)
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .style("background-color", function(d, i) {
                            return z(i);
                        });
                    d3.selectAll(".layer")
                        .classed("hover", false)
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .style("stroke-width", 0)
                        .style("fill", function(d, i) {
                            return z(i);
                        });
                }
            }
        }
    }
}