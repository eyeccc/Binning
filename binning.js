// TODO: let people download image easily
// TODO: might be better to draw scatterplot in webgl for rendering speed?
// TODO: make a draw function that people can pull out and put in their application

var VISTYPE = {
  scatter: 0,
  blending: 1,
  pt1: 2,
  pt2: 3,
  pt3: 4,
  pie1: 5,
  pie2: 6,
  weaving1: 7,
  weaving2: 8,
  texture: 9
};
var margins = {top: 20, right: 20, bottom: 40, left: 40};
var binRad = 15;
var ptData = [];

/** adjust these number later ***/
var width = 600,
    height = 600;

// bin size adjustable
var hexbin = d3.hexbin()
    .size([width,height])
    .radius(binRad);

var hexbins = hexbin(ptData);


var dropdownChange = function() {
	var e = document.getElementById("opts");
    var selectedIndex = e.selectedIndex;

	binRad = document.getElementById("myRange").value;
	hexbin = d3.hexbin()
						.size([width,height])
						.radius(binRad);
	hexbins = hexbin(ptData);
	updateVis(selectedIndex);
}

// track event change (dropdown menu selection change)
d3.select('#opts')
    .on('change',dropdownChange);
d3.select('#myRange')
	.on('change',dropdownChange);


var hexbinFunc = function(visType = -1) {
			attenuation.domain([.1, d3.max(hexbins.map(function(d) { return d.length; }))]);
			var hex = hexagon.selectAll("path")
				.data(hexbins, function(d) { return d.i + "," + d.j });

			var colorBins = 8;
			var lightnessScale = d3.scale.quantize()
				.range(d3.range(colorBins).map(
					d3.scale.linear()
						.domain([0, colorBins-1])
						.range(["#ffffff", "#000000"])
						.interpolate(d3.interpolateLab)))
				.domain(attenuation.domain());
				
			hex.exit().remove();
			hex.enter().append("path")
				.attr("d", hexbin.hexagon(binRad-0.5))
				.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
			hex.style("fill", 
				function(d) { 
					var counts = [0,0,0,0];
					d.forEach(function(p) {
						counts[p[2]]++;
					});
					
					return counts.reduce(function(p, c, i) { 
						return d3.interpolateLab(p, colors[i])(c / d.length);
					}, "white");
				})
				.style('fill-opacity', function(d) { return attenuation(d.length); });
				
		if (visType === VISTYPE.pie1) {
			d3.selectAll(".hexagons  path")
				.style('fill', function(d) { 
				return lightnessScale(d.length); 
			});
		}
		

}

var ptglyphFunc = function(visType) {
	// try to move all points in binptsvg closer to center of their respective bins
    var pp = binpts_points.selectAll('g.pts')
        .data(hexbins, function(d) { return d.i + "," + d.j; });
    pp.exit().remove();
    var newbin = pp.enter().append('g')
        .attr('class', 'pts')
        .attr('id', function(d) { return d.i + "," + d.j});

    var newpp = pp.selectAll('circle.point')
        .data(function(d) { return d; }, function(d) { return d[3]; });

    newpp.exit().remove();
    newpp.enter().append('circle')
        .attr('class', 'point')
        .attr('r', 2)
        .attr('cx', function(d) { return d[0]})
        .attr('cy', function(d) { return d[1]})
        .style('fill', function(d) { return colors[d[2]]; })
        .style('stroke', '#333')
        .style('stroke-width', '0.5px');

    // try moving points closer to the origin of their bins??
    newpp.each(function(pData, i) {
        pData.remove = false;
        pData.selected = false;
        var pt = d3.select(this);

        // is bin too far from center?
        var binCenter = d3.select(pt.node().parentNode).data().map(function(d) { return [d.x, d.y]})[0];
        var unitpt = binCenter.map(function(d, i) { return pData[i] - d; });
        var dist = Math.sqrt(unitpt.reduce(function(p, d) { return p + Math.pow(d,2); }, 0));

        var distThreshold = binRad / 2;
        if (dist > distThreshold) {
            var newPos = unitpt.map(function(d) { return d * distThreshold / dist ; });
            pt.attr('cx', binCenter[0] + newPos[0])
                .attr('cy', binCenter[1] + newPos[1]);
        }
    });
	
	// diverge here, remove baesd on # points, or # classes
    binpts_points.each(function(d, i) {
        var thisSVG = d3.select(this);
        var thisID = d3.select(thisSVG.node().parentNode.parentNode).attr('id');
        var thisPoints = thisSVG.selectAll('g.pts').selectAll('circle.point');

        // reset point state (since it's shared because we set it all at once??)
        thisPoints.each(function(d) { 
            d.remove = false;
            d.selected = false;
            d.isOutlier = false;
        })
		
        var ptThreshold = 7;
        if (visType === VISTYPE.pt2 || visType == VISTYPE.pt3) {
            // try to select one of each class
            thisPoints.forEach(function(binData, binID) {
                var binPts = d3.selectAll(binData);
                var binClasses = d3.set(binPts.data().map(function(d) { return d[2]; })).values();

                binClasses.forEach(function(thisClass) {
                    var thesePoints = binPts.filter(function(d) { return d[2] == thisClass; });

                    // try to pick the index farthest away from everything else
                    var thosePoints = binPts.filter(function(d) { return d[2] != thisClass; });
                    
                    var maxPt;
                    var maxDist = -Infinity;
                    // select the point that has the highest distance from everything else
                    thesePoints.each(function(thisPt) {
                        var minDist = Infinity;
                        thosePoints.each(function(thatPt) {
                            var dist = eucliDist(thisPt, thatPt); 
                            if (dist < minDist) {
                                minDist = dist;
                            }
                        });

                        if (minDist > maxDist) {
                            maxDist = minDist;
                            maxPt = d3.select(this);
                        }
                    });

                    var pickedPt = maxPt.each(function(d, i) {
                        d.selected = true;

                        // also mark as outlier if this is the only point of this class in this bin
                        if (thesePoints.size() == 1) 
                            d.isOutlier = true; 
                    });
                });

                var shuf = shuffle(d3.range(binPts.data().length));
                var order = {};
                binPts.data().map(function(d) { return d[3]; })
                    .forEach(function(d, i) { order[d] = shuf[i]; });

                // see if we can highlight any more points
                binPts.sort(function(a,b) { 
                    return a.selected ?
                        (b.selected ? 0 : -1) :
                        (b.selected ? 1 : order[a[3]] - order[b[3]]);
                });

                binPts.each(function(curData, curI) { 
                    if (!curData.remove) {
                        binPts.each(function(d, i) {
                            if (eucliDist(d, curData) < ptThreshold && i != curI && !d.selected)
                                d.remove = true;
                        });
                    }
                });
            });

            // finally, actually remove the subsampled points
            thisPoints.filter(function(d) { return d.remove; }).remove();

            // identify points that are single outliers and replace them with crosses
            var cross = d3.svg.symbol().type("triangle-up").size(10);
            if (visType === VISTYPE.pt3) {
                thisPoints.filter(function(d) { return !!d.isOutlier; }).forEach(function(grpOutliers) {
                    theseOutliers = d3.selectAll(grpOutliers).each(function(d) {
                        var thisPt = d3.select(this);
                        d3.select(thisPt.node().parentNode).append('path')
                            .attr('class', 'outlier')
                            .attr('transform', 'translate('+thisPt.attr('cx')+','+thisPt.attr('cy')+')')
                            .attr('d', cross)
                            .style('fill', colors[d[2]])
                            .style('stroke', '#333')
                            .style('stroke-width', '0.5px');
                        thisPt.style('opacity', '0');
                    });
                });
            }

        } else if (visType === VISTYPE.pt1) {
            // subsample.  just flag points, then remove all that conflict
            thisPoints.forEach(function(binData, binID) {
                var order = shuffle(d3.range(binData.length));
                var binPts = d3.selectAll(binData);
                order.forEach(function(i) {
                    var curPt = d3.select(binData[i]);
                    var curData = curPt.datum();

                    // if point has not already been marked to remove, remove its neighbors
                    if (!curData.remove) {
                        // select all points except the current one that are within 2px and remove them
                        binPts.each(function(d, thisI) { 
                            if (eucliDist(d, curData) < ptThreshold && thisI != i)
                                d.remove = true; 
                        });
                    }
                });
            });

            // finally, actually remove the subsampled points
            thisPoints.filter(function(d) { return d.remove; }).remove();
        } else 
            throw "unimplemented subsampling routing for svg#" + thisID;
    });
}

var binpieFunc = function(visType) {
	 // deal with pies
    var pp = binpie_pies.selectAll('g.pts')
        .data(hexbins, function(d) { return d.i + "," + d.j; })
    pp.exit().remove();
    var newpies = pp.enter().append('g')
        .attr('class', 'pie')
        .attr('id', function(d) { return d.i + "," + d.j; })
        .attr('transform', function(d) { return 'translate(' + d.x + "," + d.y + ")"});
    
    var pieScale = d3.scale.pow().exponent(2)
        .range([4, binRad - 2])
        .domain(d3.extent(d3.selectAll(pp[0]).data().map(function(d) { return d.length; })));

    pp.each(function(binPts) {
        var thisPie = d3.select(this);

		var isSize = visType === VISTYPE.pie2;
        if (isSize)
            arc.outerRadius(pieScale(binPts.length));
        else
            arc.outerRadius(binRad/2)

        // count the number of classes here
        var counts = binPts.reduce(function(p, pt) {
            var thisClass = pt[2];
            if (!p[thisClass])
                p[thisClass] = 1;
            else 
                p[thisClass]++;
            return p;
        }, Array(classNum).fill(0));

        thisPie.selectAll('.arc').remove();
        var arcs = thisPie.selectAll('.arc')
            .data(pie(counts))
            .enter().append('g')
                .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .style('fill', function(d, i) { 
                return colors[i]; 
            })
            .style('opacity', function(d) { return isSize ? 1 : attenuation(binPts.length); });

    });
}

// TODO: there is something wrong for weaving rendering
var weavingFunc = function(visType) {
	// deal with weaving

    d3.selectAll("svg.pts + canvas").each(function() {
        var thisCanvas = d3.select(this);
        var thisID = d3.select(thisCanvas.node().parentNode).select("svg").attr('id');
    
        var ctx = thisCanvas.node().getContext("2d");
        ctx.clearRect(0, 0, width, height);

        // get the generalized hexagon path
        var hexAngles = d3.range(0, 2 * Math.PI, Math.PI / 3);
        var hexPos = hexAngles.map(function(angle) {
            var x = Math.sin(angle) * (binRad - 0.5);
            var y = -Math.cos(angle) *  (binRad - 0.5);
            return [x,y];
        }) 

        // now, go through each bin, figure out the proportions, then fill in the hexagon

        hexbins.forEach(function(binPts) {
            // save original transformation (identity)
            ctx.save();

            // move to the bin center
            ctx.translate(binPts.x, binPts.y);

            // define the hexagon path
            ctx.beginPath();
            hexPos.forEach(function(pos, i) {
                if (i == 0) ctx.moveTo(pos[0], pos[1]);
                else ctx.lineTo(pos[0], pos[1]);
            });
            ctx.closePath();
            ctx.clip();

            // round to nearest full pixel
            ctx.translate(binPts.x - Math.floor(binPts.x), binPts.y - Math.floor(binPts.y));

            // draw rectangle of weaving, clipping will make it a hexagon
            var w = Math.ceil( (binRad - 0.5)) * 2;
            ctx.translate(-w / 2, -w / 2);
            
            // all pixels to fill; see <http://bl.ocks.org/yelper/aa0860f4d35997a3c94df34764be97b9>
            var ptData = binPts.map(function(d) { return d[2]; });

			// This part is for showing density of color weaving.
            if (visType != VISTYPE.weaving1) {
				//attenuation(binPts.length);
				var len = attenuation.domain()[1] >= ptData.length ? attenuation.domain()[1] - ptData.length : 0;
                ptData = ptData.concat(Array(len).fill(-1));
            }

            var pixelSize = 1;
            for (var i = 0; i < w * w / pixelSize; i++) {
                var di = i % ptData.length;
                if (di === 0) shuffle(ptData);

                var x = i % w;
                var y = Math.floor(i / w);

                // skip drawing this pixel if we're simulating proportional measurement
                if (ptData[di] == -1) continue;

                ctx.fillStyle = colors[ptData[di]];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }

            // restore to origin (0,0)
            ctx.restore();
        });
    });

    // add outlines for sparse weaving
    d3.selectAll(" .hexagons > path")
        .attr('d', hexbin.hexagon(Math.ceil( (binRad - 0.5))))
		.style('fill', 'none')
        .style('stroke', "#333")
        .style('stroke-width', '1');
	

}

var textureFunc = function() {
	// deal with textures (try to be smart about line orientation?)
    d3.selectAll("svg.pts").each(function() {
        var thisCanvas = d3.select(this);
        var test = thisCanvas.selectAll("clipPath#hex")
            .data([0]);
			
		test.enter().append('clipPath')
                .attr('id', 'hex')
                    .append('path')
                    .attr('d', d3.hexbin().radius(binRad).hexagon()); 
					
		test.select("clipPath#hex path")
			.attr('d', d3.hexbin().radius(binRad).hexagon());

        // blank out background colors
        thisCanvas.selectAll('g.hexagons path')
            .style('fill', null)
            .style('fill-opacity', 0)
            .style('stroke', 'black')
            .style('stroke-width', 0.5);

        // do brain-dead thing and get max of any one class in all
        var maxClass = hexbins.reduce(function(p, thishex) {
            thiscount = thishex.reduce(
                function(p, d) { 
                    p[d[2]]++; return p;
                }, Array(classNum).fill(0));
            return p.map(function(d, i) {
                return d > thiscount[i] ? d : thiscount[i];
            });
        }, Array(classNum).fill(0));
        
        var freq = d3.scale.quantize()
            .domain([0, d3.max(maxClass)])
            .range(d3.range(1,12)); // bin the numerosity into 12 categories
        var angles = d3.range(0, Math.PI, Math.PI / classNum);


        var ll = bin_lines.selectAll('g.binlines')
            .data(hexbins, function(d) { return d.i + "," + d.j; });
        ll.exit().remove();
        var newlines = ll.enter().append('g')
            .attr('class', 'binlines')
            .attr('id', function(d) { return d.i + "," + d.j; })
            .attr('clip-path', 'url(#hex)')
            .attr('transform', function(d) { return 'translate(' + d.x + "," + d.y + ")"; });

        ll.each(function(thishex) {
            var thisbin = d3.select(this);
            var thiscount = thishex.reduce(
                function(p, d) { 
                    p[d[2]]++; return p;
                }, Array(classNum).fill(0));

            var linegrp = thisbin.selectAll('g.linegrp')
                .data(thiscount);
            linegrp.enter().append('g')
                .attr('class', 'linegrp');

            linegrp.each(function(count, i) {
                // skip drawing lines if count == 0
                if (count == 0) return;

                var thisgrp = d3.select(this);
                var x = ( (binRad - 0.5) )* Math.sin(angles[i]);
                var y = ( (binRad - 0.5) ) * Math.cos(angles[i]);

                var numFreq = freq(count);
                var stepSize =  (binRad * 2*  Math.cos(15)) / numFreq;

                var startAtZero = numFreq % 2 == 1;
                for (var k = 0; k < numFreq; k++) {
                    if (startAtZero) {
                        var pos = k % 2 == 1 ? -1 : 1;
                        var shift = Math.ceil(k / 2) * stepSize * pos;
                        var shiftx = shift * Math.cos(angles[i]);
                        var shifty = shift * Math.sin(angles[i]);
                    } else {
                        var pos = k % 2 == 1 ? -1 : 1;
                        var shift = (stepSize / 2 * pos) + Math.floor(k / 2) * stepSize * pos;
                        var shiftx = shift * Math.cos(angles[i]);
                        var shifty = shift * Math.sin(angles[i]);
                    }

                    // var pos = k % 2 == 1 ? -1 : 1;
                    // var shift = Math.floor(k / 2) * stepSize * pos;

                    thisgrp.append('line')
                        .attr({
                            'x1': x + shiftx,
                            'x2': -x + shiftx,
                            'y1': y - shifty,
                            'y2': -y - shifty
                        })
                        .style('stroke', colors[i])
                        .style('stroke-width', 1);
                }
            });
		});
	});
}

var updateVis = function(selectedIndex) {
	console.log("for debugging:");
    console.log(selectedIndex); // TODO: remove this log
	
	// TODO: It is better to do state change detection here, 
	// so we don't need to redraw everytime we change the dropdown list
	
	// remove all hexagons
	d3.selectAll(".hexagons  path").remove();
	// remove all points from scatter plot
	points.selectAll('circle.point').remove();
	// remove all bin points
	binpts_points.selectAll('circle.point').remove();
	// remove outlier
	d3.selectAll(".outlier").remove();
	// remove pies
	d3.selectAll(".pie").remove();
	// clear canvas
	d3.selectAll('canvas')
        .attr('width', width)
        .attr('height', height);
	// remove textures
	d3.selectAll('.binlines').remove();

    switch (selectedIndex) {
		case VISTYPE.scatter: //scatterplot
			var pts = points.selectAll('circle.point')
			.data(ptData, function(d) { return d[3]; });
		
			pts.exit().remove();
			pts.enter().append('circle')
				.attr("class", "point")
				.attr('r', ptSize)
				.attr('cx', function(e) { return e[0]; })
				.attr('cy', function(e) { return e[1]; })
				.style('fill', function(e) { return colors[e[2]]; });
			break;
			
		case VISTYPE.blending: // blending
			hexbinFunc();
			break;
		// TODO: fill out all option
		case VISTYPE.pt1:
			hexbinFunc();
			ptglyphFunc(VISTYPE.pt1);
			break;
		case VISTYPE.pt2:
			hexbinFunc();
			ptglyphFunc(VISTYPE.pt2);
			break;
		case VISTYPE.pt3:
			hexbinFunc();
			ptglyphFunc(VISTYPE.pt3);
			break;
		case VISTYPE.pie1:
			hexbinFunc(VISTYPE.pie1);
			binpieFunc(VISTYPE.pie1);
			break;
		case VISTYPE.pie2:
			binpieFunc(VISTYPE.pie2);
			break;
		case VISTYPE.weaving1:
			weavingFunc(VISTYPE.weaving1);
			break;
		case VISTYPE.weaving2:
			hexbinFunc();
			weavingFunc(VISTYPE.weaving2);
			break;
		case VISTYPE.texture:
			hexbinFunc();
			textureFunc();
		default: // do nothing
			break;
	
	}
};

// adjust this according to the dataset
var xd = [0, 10];
var yd = [0, 10];

var classNum = 4;
var colors = d3.scale.category10().range().slice(0, classNum); 

var svgDefs = [
	{
        name: "scatter",
        classes: "pts"
    }
];

d3.select("body").selectAll('svg')
    .data(svgDefs).enter()
    .append('svg')
        .attr('id', function(d) { return d.name + "svg"; })
        .attr('class', function(d) { return d.classes; })
        .attr('width', width)
        .attr('height', height); 

// add a canvas element behind any elements that request them
d3.selectAll("svg.pts").each(function() {
    var thisSVG = d3.select(this);
    var thisID = thisSVG.attr('id');
    var thisPrefix = thisID.split("svg")[0];

    var thisContainer = d3.select("body").insert("div", "#" + thisID)
        .attr("id", thisPrefix + "-container")
        .attr('class', 'canvasContainer')
        .style('width', width + "px") // have to define a width for this to be a placeable div
		.style('height', height + "px");
    
    // add the svg
    thisSVG.remove();
    thisContainer.append(function() {
        return thisSVG.node();
    });

    // then append a canvas element
    thisContainer.append('canvas')
        .attr('width', width - margins.left - margins.right)
        .attr('height', height - margins.top - margins.bottom)
        .style('top', margins.top + "px")
        .style('left', margins.left + "px");
});

width = d3.select("svg").attr('width') - margins.left - margins.right;
height = d3.select("svg").attr('height') - margins.top - margins.bottom;

var x1 = d3.scale.linear()
    .domain(xd)
    .range([0, width]);
    
var y1 = d3.scale.linear()
    .domain(yd)
    .range([height, 0]);

var pie = d3.layout.pie()
    .sort(d3.descending);

var arc = d3.svg.arc()
    .outerRadius(8)
    .innerRadius(0);

svg = d3.selectAll('svg').append('g')
    .attr("transform", "translate(" + margins.left + ", " + margins.top + ")");	

var hexsvgs = d3.selectAll('svg.pts > g');
hexsvgs.append('clipPath')
    .attr('id', 'clip')
  .append('rect')
    .attr('class', 'mesh')
    .attr('width', width)
    .attr('height', height);

var hexagon = hexsvgs.append("g")
    .attr('clip-path', 'url(#clip)')
    .attr("class", "hexagons");

var ptsvgs = d3.selectAll('svg.pts > g');
var points = ptsvgs.append('g').attr('class', 'points')
    .attr('clip-path', 'url(#clip)');

var binptsvgs = d3.selectAll('svg.pts > g');
var binpts_points = binptsvgs.append('g').attr('class', 'points')
    .attr('clip-path', 'url(#clip)');

var binpie_pies = d3.selectAll('svg.pts > g')
    .append('g').attr('class', 'pts')
    .attr('clip-path', 'url(#clip)');

var bin_lines = d3.selectAll('svg.pts > g')
    .append('g').attr('class', 'lines')
    .attr('clip-path', 'url(#clip)');

var attenuation = d3.scale.log().range([0,1]);

var ptSize = 3;


var ptId = 0;
var filename = "cluster-data.csv";
var getFileName = function() {
	filename = document.getElementById("file").value;
	// TODO: require getting full path length
	draw(filename);
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

var obj_mapping = {};
var draw  = function(data_src = "cluster-data.csv") {
	console.log(data_src);
	// reset old dataset
	ptData = []; 
	ptId = 0;
	
	d3.csv(data_src, function(d) { 
		return [+d.x, +d.y, d.category, ptId++]; 
	  }, function(error, rows) {
		
		// find min and max in the dataset to reset the domain of the vis
		var xmin = Math.min.apply(Math, rows.map(function(v) {
		  return v[0];
		}));
		var xmax = Math.max.apply(Math, rows.map(function(v) {
		  return v[0];
		}));
		var ymin = Math.min.apply(Math, rows.map(function(v) {
		  return v[1];
		}));
		var ymax = Math.max.apply(Math, rows.map(function(v) {
		  return v[1];
		}));
		
		// This part is not very efficient though
		// count number of classes in the dataset to change color setting
		var cat = rows.map(function(v){return v[2];});
		var uniqueClass = cat.filter(onlyUnique);
		classNum = uniqueClass.length;
		colors = d3.scale.category10().range().slice(0, classNum); 
		
		
		for (var i = 0; i < classNum; i++) {
			obj_mapping[uniqueClass[i]] = i;
		}
		d3.selectAll('.label').remove();
		// this part is for color mapping information
		var newsvg = 
			d3.select('body')
				.append('svg')
				.attr('class', 'label')
				.attr('width', '600px')
				.attr('height', '100px');
				
		for(var i = 0; i < classNum; i++) {
			newsvg.append('rect')
					.attr('class', 'label')
					.attr('x', i*100+ 100)
					.attr('width', '20px')
					.attr('height', '20px')
					.attr('fill', colors[i]);
			newsvg.append('text')
						.attr('class', 'label')
						.attr('x', i*100+ 130)
						.attr('y', 15)
						.style('fill', 'black')
						.text(uniqueClass[i]);
		}	
		
		xd = [Math.floor(xmin), Math.ceil(xmax)];
		yd = [Math.floor(ymin), Math.ceil(ymax)];
		x1 = d3.scale.linear()
			.domain(xd)
			.range([0, width]);
			
		y1 = d3.scale.linear()
			.domain(yd)
			.range([height, 0]);
		
		// clean up old scale
		d3.selectAll('.tick').remove();
		
		svg.append('g')
			.attr('class', 'xaxis axis')
			.attr('transform', 'translate(0,' + height + ')')
			.call(d3.svg.axis().orient('bottom').scale(x1));
			
		svg.append('g')
			.attr('class', 'yaxis axis')
			.call(d3.svg.axis().orient("left").scale(y1));
		
		var lables = svg.append('g')
			.attr('class', 'labels')
			.attr('transform', 'translate(500,500)');
		
		
		// transform data points to the position on display
		rows = rows.map(function(v){
			return [x1(v[0]), y1(v[1]), obj_mapping[v[2]], v[3]];
		});

		ptData = rows;

		// keep the previous design selection when changing to another dataset
		var e = document.getElementById("opts");
		var selectedIndex = e.selectedIndex;
		updateVis(selectedIndex);  
	  }
	);

}

// initial drawing
draw(filename);

function eucliDist(pt1, pt2) {
    return Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
}

// fisher-yates shuffling
function shuffle(arr) {
    var i = arr.length;
    var tmp, ri;
    while (i !== 0) {
        ri = Math.floor(Math.random() * i--);
        tmp = arr[i];
        arr[i] = arr[ri];
        arr[ri] = tmp;
    }

    return arr;
};


    
