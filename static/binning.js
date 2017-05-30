var Binning = (function() {
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
	  texture: 9,
	  attrblk: 10,
	  bar: 11
	};

	var margins = {top: 20, right: 20, bottom: 40, left: 40};
	var binRad = 25;
	var ptData = [];

	/** adjust these number later ***/
	var width = 600,
		height = 600;

	// bin size adjustable
	var hexbin = d3.hexbin()
		.size([width,height])
		.radius(binRad);

	var hexbins = hexbin(ptData);

	var setUpBin = function(bin_radius, selectedIndex) {
		binRad = bin_radius;
		hexbin = d3.hexbin()
					.size([width,height])
					.radius(binRad);
		hexbins = hexbin(ptData);
		if (selectedIndex > 0) {
			updateVis(selectedIndex);
		}
	}

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
						var counts = Array(classNum).fill(0);
						d.forEach(function(p) {
							counts[p[2]]++;
						});
						
						return counts.reduce(function(p, c, i) { 
							return d3.interpolateLab(p, colors[i])(c / d.length);
						}, "white");
					})
					.style('fill-opacity', function(d) { return attenuation(d.length); });
					
			if (visType === VISTYPE.pie1 || visType === VISTYPE.bar) {
				d3.selectAll(".hexagons  path")
					.style('fill', function(d) { 
					return lightnessScale(d.length); 
				});
			}
	}

	var ptglyphFunc = function(visType) {
		// try to move all points in binptsvg closer to center of their respective bins

		hexbinFunc();
		// since we don't want to modify original data but want to keep all the information of each updated point
		newobj = [];
		for(var i = 0; i < hexbins.length; i++) {
			var len = hexbins[i].length;
			for(var j = 0; j < len; j++) {
				var binCenter = [hexbins[i].x, hexbins[i].y];
				var unitpt = [hexbins[i][j][0] - binCenter[0], hexbins[i][j][1] - binCenter[1]];
				var dist = Math.sqrt(unitpt.reduce(function(p, d) { return p + Math.pow(d,2); }, 0));
				
				var distThreshold = binRad / 2;
				var ptx = hexbins[i][j][0];
				var pty = hexbins[i][j][1];
				if (dist > distThreshold) {
					var newPos = unitpt.map(function(d) { return d * distThreshold / dist ; });
					ptx= binCenter[0] + newPos[0];// bad to modify data
					pty= binCenter[1] + newPos[1];
				}
				
				newobj.push(	[ptx, pty, hexbins[i][j][2], hexbins[i][j][3]]);
			}
		}
		var newhexbins = hexbin(newobj);
		var pp = binpts_points.selectAll('g.pts')
			.data(newhexbins, function(d) { return d.i + "," + d.j; });
		pp.exit().remove();
		var newbin = pp.enter().append('g')
			.attr('class', 'pts')
			.attr('id', function(d) { return d.i + "," + d.j});
		var newpp = pp.selectAll('circle.point')
			.data(function(d) { return d; }, function(d) { return d[3]; });

		newpp.exit().remove();
		// diverge here, remove baesd on # points, or # classes
		newhexbins.forEach(function(binPts){
			var thisPoints = binPts;
			thisPoints.forEach(function(d) { 
				d.remove = false;
				d.selected = false;
				d.isOutlier = false;
			})
			
			var ptThreshold = 7;
			if (visType == VISTYPE.pt2 || visType == VISTYPE.pt3) {
				// try to select one of each class
				var binClasses = d3.set(binPts.map(function(d) { return d[2]; })).values();

				binClasses.forEach(function(thisClass) {
						var thesePoints = binPts.filter(function(d) { return d[2] == thisClass; });
						// try to pick the index farthest away from everything else
						var thosePoints = binPts.filter(function(d) { return d[2] != thisClass; });
						
						var maxPt;
						var maxDist = -Infinity;
						thesePoints.forEach(function(thisPt) {
							var minDist = Infinity;
							thosePoints.forEach(function(thatPt) {
								var dist = eucliDist(thisPt, thatPt); 
								if (dist < minDist) {
									minDist = dist;
								}
							});

							if (minDist > maxDist) {
								maxDist = minDist;
								maxPt = thisPt;
							}
						});
						
						maxPt.selected = true;
						if (thesePoints.length == 1) 
								maxPt.isOutlier = true; 
				});
				
				// some problem here
				var shuf = shuffle(d3.range(binPts.length));
					var order = {};
					binPts.map(function(d) { return d[3]; })
						.forEach(function(d, i) { order[d] = shuf[i]; });

					// see if we can highlight any more points
					binPts.sort(function(a,b) { 
						return a.selected ?
							(b.selected ? 0 : -1) :
							(b.selected ? 1 : order[a[3]] - order[b[3]]);
					});

					binPts.forEach(function(curData, curI) { 
						if (!curData.remove) {
							binPts.forEach(function(d, i) {
								if (eucliDist(d, curData) < ptThreshold && i != curI && !d.selected && !d.isOutlier)
									d.remove = true;
									
							});
						}
					});

				if(visType == VISTYPE.pt2){
					var plotpts = thisPoints.filter(function(d) { return !d.remove; });
				
					plotpts.forEach(function(d){
						d3.select('svg').append('circle')
						.attr('class', 'point')
						.attr('id', d[3])
						.attr('transform','translate(40,20)')
						.attr('r', 2)
						.attr('cx', d[0])
						.attr('cy', d[1])
						.style('fill', colors[d[2]])
						.style('stroke', '#333')
						.style('stroke-width', '0.5px');

					});
				}else if(visType == VISTYPE.pt3) {
					var cross = d3.svg.symbol().type("triangle-up").size(10);
					var plotpts = thisPoints.filter(function(d) { return !d.remove; });
					var outliers = thisPoints.filter(function(d){return d.isOutlier;});
					plotpts = plotpts.filter(function(d){return !d.isOutlier;});
				
					plotpts.forEach(function(d){
						d3.select('svg').append('circle')
						.attr('class', 'point')
						.attr('id', d[3])
						.attr('r', 2)
						.attr('transform','translate(40,20)')
						.attr('cx', d[0])
						.attr('cy', d[1])
						.style('fill', colors[d[2]])
						.style('stroke', '#333')
						.style('stroke-width', '0.5px');

					});

					outliers.forEach(function(d){
						var x = 40+d[0];
						var y = 20+d[1];
						d3.select('svg').append('path')
						.attr('class', 'point outlier')
						.attr('transform','translate('+x+','+y+')')
						.attr('id', 'o'+d[3])
						.attr('d', cross)
						.style('fill', colors[d[2]])
						.style('stroke', '#333')
						.style('stroke-width', '0.5px');

					});
				}
				
				
			}else if(visType == VISTYPE.pt1){
				var order = shuffle(d3.range(thisPoints.length));
				order.forEach(function(i){
					var curPt = thisPoints[i];
					if(!curPt.remove) {
						thisPoints.forEach(function(pt, idx){
							if (eucliDist(pt, curPt) < ptThreshold && idx != i)
									pt.remove = true; 
						});
						
					}
				});

				// finally, actually remove the subsampled points
				//thisPoints.filter(function(d) { return d.remove; }).remove();
				var plotpts = thisPoints.filter(function(d) { return !d.remove; });
				
					plotpts.forEach(function(d){
						d3.select('svg').append('circle')
						.attr('class', 'point')
						.attr('id', d[3])
						.attr('transform','translate(40,20)')
						.attr('r', 2)
						.attr('cx', d[0])
						.attr('cy', d[1])
						.style('fill', colors[d[2]])
						.style('stroke', '#333')
						.style('stroke-width', '0.5px');
					});
			}
		}) ;
	}

	var binpieFunc = function(visType) {
		 // deal with pies
		 if(visType == VISTYPE.pie1) {
			hexbinFunc(VISTYPE.pie1);
		 }
		 
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

	var weavingFunc = function(visType) {
		// deal with weaving
		if (visType == VISTYPE.weaving2) {
			hexbinFunc();
		}
		
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
		hexbinFunc();
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
	
	var attrblkFunc = function(){
		hexbinFunc();
		d3.selectAll("svg.pts").each(function() {
			var thisCanvas = d3.select(this);
			var element = thisCanvas.selectAll("clipPath#hex")
				.data([0]);
				
			element.enter().append('clipPath')
					.attr('id', 'hex')
						.append('path')
						.attr('d', d3.hexbin().radius(binRad).hexagon()); 
						
			element.select("clipPath#hex path")
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
			
			var n = Math.ceil(Math.sqrt(classNum)); // what's the squarified number to fit numClasses?
			var dn = binRad/n;                      // how large is each bin?
			var startn = -(n / 2) * dn;             // what's the starting offset, given the center bin is at 0,0?
			var offsety = Math.floor(classNum / n) < n ? dn / 2 : 0; // adjust starting y offset if last row is not filled

			var ll = bin_blocks.selectAll('g.binblocks')
				.data(hexbins, function(d) { return d.i + "," + d.j; });
			ll.exit().remove();
			var newblocks = ll.enter().append('g')
				.attr('class', 'binblocks')
				.attr('id', function(d) { return d.i + "," + d.j; })
				.attr('clip-path', 'url(#hex)')
				.attr('transform', function(d) { return 'translate(' + d.x + "," + d.y + ")"; });

			ll.each(function(thishex) {
				var thisbin = d3.select(this);
				var thiscount = thishex.reduce(
					function(p, d) { 
						p[d[2]]++; return p;
					}, Array(classNum).fill(0));

				var blkgrp = thisbin.selectAll('g.blkgrp')
					.data(thiscount);
				blkgrp.enter().append('g')
					.attr('class', 'blkgrp');

				blkgrp.each(function(count, i) {
					var thisgrp = d3.select(this);
					var x = (i % n) * dn + startn;
					var y = Math.floor(i / n) * dn + startn + offsety;

					var colorinter = 
						d3.interpolateLab("white", colors[i])(count/maxClass[i]);

					thisgrp.append('rect')
							.attr({
								'x': x,
								'y': y,
								'width': dn,
								'height': dn
							})
							.style('fill', colorinter)
							.style('stroke', 'black')
							.style('stroke-width', 0.5);
				});
			});
		});
		
	}
	
	var barFunc = function(){
		hexbinFunc(VISTYPE.bar);	
		d3.selectAll("svg.pts").each(function() {
			var thisCanvas = d3.select(this);
			var element = thisCanvas.selectAll("clipPath#hex")
				.data([0]);
				
			element.enter().append('clipPath')
					.attr('id', 'hex')
						.append('path')
						.attr('d', d3.hexbin().radius(binRad).hexagon()); 
						
			element.select("clipPath#hex path")
				.attr('d', d3.hexbin().radius(binRad).hexagon());

			// blank out background colors
			thisCanvas.selectAll('g.hexagons path')
				.style('stroke', 'black')
				.style('stroke-width', 0.5);

			var ll = bin_bar.selectAll('g.bar')
				.data(hexbins, function(d) { return d.i + "," + d.j; });
			ll.exit().remove();
			var newbars = ll.enter().append('g')
				.attr('class', 'bar')
				.attr('id', function(d) { return d.i + "," + d.j; })
				.attr('clip-path', 'url(#hex)')
				.attr('transform', function(d) { return 'translate(' + d.x + "," + d.y + ")"; });

			ll.each(function(thishex) {
				var thisbin = d3.select(this);
				var thiscount = thishex.reduce(
					function(p, d) { 
						p[d[2]]++; return p;
					}, Array(classNum).fill(0));
				
				var thisSum = thiscount.reduce(function(acc, val) {
				  return acc + val;
				}, 0);

				var bargrp = thisbin.selectAll('g.bargrp')
					.data(thiscount);
				bargrp.enter().append('g')
					.attr('class', 'bargrp');

				bargrp.each(function(count, i) {
					var thisgrp = d3.select(this);
					var w = Math.abs(binRad* Math.cos(30/ Math.PI)*2/classNum)/2; //* Math.cos(30/ Math.PI);
					var x = -w*classNum/2;//( (binRad - 0.5) )* Math.sin(angles[i]);
					var y = Math.abs(binRad * Math.cos(30/ Math.PI))/2;//( (binRad - 0.5) ) * Math.cos(angles[i]);

					thisgrp.append('rect')
							.attr({
								'x': x + i*w,
								'y': y - Math.abs(binRad* Math.cos(30/ Math.PI)*count/thisSum),
								'width': w,
								'height': Math.abs(binRad* Math.cos(30/ Math.PI)*count/thisSum)
								})
							.style('fill', colors[i])
							.style('stroke', 'black')
							.style('stroke-width', 0.5);
				});
			});
		});
		
	}

	var updateVis = function(selectedIndex) {		
		// TODO: It is better to do state change detection here, 
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
		d3.selectAll(".point").remove();
		// clear canvas
		d3.selectAll('canvas')
			.attr('width', width)
			.attr('height', height);
		// remove textures
		d3.selectAll('.binlines').remove();
		// remove blocks
		d3.selectAll(".binblocks").remove();
		// remove bars
		d3.selectAll(".bar").remove();

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
			case VISTYPE.pt1:
				ptglyphFunc(VISTYPE.pt1);
				break;
			case VISTYPE.pt2:
				ptglyphFunc(VISTYPE.pt2);
				break;
			case VISTYPE.pt3:
				ptglyphFunc(VISTYPE.pt3);
				break;
			case VISTYPE.pie1:
				binpieFunc(VISTYPE.pie1);
				break;
			case VISTYPE.pie2:
				binpieFunc(VISTYPE.pie2);
				break;
			case VISTYPE.weaving1:
				weavingFunc(VISTYPE.weaving1);
				break;
			case VISTYPE.weaving2:
				weavingFunc(VISTYPE.weaving2);
				break;
			case VISTYPE.texture:
				textureFunc();
				break;
			case VISTYPE.attrblk:
				attrblkFunc();
				break;
			case VISTYPE.bar:
				barFunc();
				break;
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
			.attr('id', 'canvastest')
			.attr('width', width - margins.left - margins.right)
			.attr('height', height - margins.top - margins.bottom)
			.style('top', margins.top + "px")
			.style('left', margins.left + "px");
	});

	width = d3.select("svg").attr('width') - margins.left - margins.right;
	height = d3.select("svg").attr('height') - margins.top - margins.bottom;
	d3.select("body")
	  .insert('div', "#label-container")
	  .attr('height', '100px')
	  .attr('id', 'label-container');

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

	var bin_blocks = d3.selectAll('svg.pts > g')
		.append('g').attr('class', 'blocks')
		.attr('clip-path', 'url(#clip)');
		
	var bin_bar = d3.selectAll('svg.pts > g')
		.append('g').attr('class', 'bars')
		.attr('clip-path', 'url(#clip)');

	var attenuation = d3.scale.log().range([0,1]);

	var ptSize = 3;
	var ptId = 0;
	var filename = "cluster-data.csv";
	var setFileName = function(f_name = undefined) {
		filename = f_name || document.getElementById("file").files[0].name;
	}

	function onlyUnique(value, index, self) { 
		return self.indexOf(value) === index;
	}

	var obj_mapping = {};
	var xcol = "x";
	var ycol = "y";
	var catcol = "category";
	var xmin = 0;
	var xmax = 10;
	var ymin = 0;
	var ymax = 10;
	var ourRange = false;
	
	var setColAndRange = function(
		x = "x",
		y="y",
		c="category",
		x1=0,
		x2=10,
		y1 =0,
		y2=10,
	){
		xcol =  x;
		ycol =  y;
		catcol = c;
		
		xmin = x1 != "optional" ? parseFloat(x1) : xmin;
		xmax = x2 != "optional" ?parseFloat(x2) :xmax;
		ymin = y1 != "optional" ?parseFloat(y1):ymin;
		ymax = y2 != "optional" 	?	parseFloat(y2):ymax;
				
		if (x1 != "optional" || x2 != "optional" || y1 != "optional" || y2 != "optional" ){
			ourRange = true;
		}else{
			ourRange = false;
		} 

		draw(filename);
	}

	var draw  = function(data_src, visChoice = null, binSize = null) {
		filename = data_src;
		// reset old dataset
		ptData = []; 
		ptId = 0;
		
		d3.csv(data_src, function(d) { 
			return [+d[xcol], +d[ycol], d[catcol], ptId++]; //TODO: let user input their column name?
		  }, function(error, rows) {
			try {
				if(!ourRange)  {
					[xmin, xmax] = d3.extent(rows, function(d){return d[0]});
					[ymin, ymax] = d3.extent(rows, function(d){return d[1]});
				}
			} catch(err) {
				console.log(err);
				alert(
					"More than ~125k data instances will exceed call stack."+
					"Cannot use built-in data range calculation."+
					"Using default size range [0, 10] instead."+
					"Please set your own data range if possible."
				);
				xmin = 0; ymin = 0;
				xmax = 10; ymax = 10;
			}
			
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
			// TODO: need to adjust position, the current version might cause text overlapping when text is too long
			var newsvg = 
				d3.select('#label-container')
					.append('svg')
					.attr('class', 'label')
					.attr('width', '600px')
					.attr('height', '100px');
			
			var y_offset = 0;
			//var x_offset = 100;
			for(var i = 0; i < classNum; i++) {
				newsvg.append('rect')
						.attr('class', 'label')
						.attr('x', (i%5)*100+ 100)
						.attr('y',  y_offset)
						.attr('width', '10px')
						.attr('height', '10px')
						.attr('fill', colors[i]);
				newsvg.append('text')
							.attr('class', 'label')
							.attr('x', (i%5)*100+ 130)
							.attr('y', 12 + y_offset)
							.style('fill', 'black')
							.text(uniqueClass[i]);
				if(i % 5 == 4) {
					y_offset += 20;
				}
			}	
			var xd_int = xmax - xmin;
			var yd_int = ymax - ymin;
			xd = [xmin - xd_int/20, xmax+xd_int/20 ];
			yd = [ymin - yd_int/20, ymax+yd_int/20];
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
			
			// This part is for setting style while generating image
			// since overlay svg to canvas, it does not read css style correctly
			d3.selectAll('.axis line')
				.style('fill', 'none')
				.style('stroke', '#000')
				.style('shape-rendering', 'crispEdges');
			d3.selectAll('.axis path')
				.style('fill', 'none')
				.style('stroke', '#000')
				.style('shape-rendering', 'crispEdges');
			
			var lables = svg.append('g')
				.attr('class', 'labels')
				.attr('transform', 'translate(500,500)');

			// transform data points to the position on display
			rows = rows.map(function(v){
				return [x1(v[0]), y1(v[1]), obj_mapping[v[2]], v[3]];
			});

			ptData = rows;
			binRad = binSize || binRad;
			hexbin = d3.hexbin()
							.size([width,height])
							.radius(binRad);
			hexbins = hexbin(ptData);
			// keep the previous design selection when changing to another dataset
			var e = document.getElementById("opts");
			var selectedIndex = visChoice || e.selectedIndex;
			updateVis(selectedIndex);  
		  }
		);
	}

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
	
	return {
		draw: draw,
		setFileName: setFileName,
		setColAndRange: setColAndRange,
		updateVis: updateVis,
		setUpBin: setUpBin
	};
})();