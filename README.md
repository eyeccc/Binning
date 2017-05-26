# Binning
Exploration of different designs of binning (A survey)

Link to paper-preprint coming soon...

# Usage
1. Run `app.py` and goto `localhost:5000`. This version is capable of handling files in any directory.
2. Try this on: https://binning.herokuapp.com/ (Deploy flask app to heroku. Since this is based on free account, it's slow.)
3. Alternatively, include 'Binning.js' in your file. Directly use ```Binning.draw(filename, vistype, binSize)``` to draw a specific one you like. 
Note that if you are trying to pull out only the draw function, ```filename``` and ```vistype``` are required.
You could also set up the column name in your csv by `Binning.setColName(x, y, category)`. The default column names are `x, y, category`.
The following are the enumeration of different vis types:
```
var VISTYPE = {
	  scatter: 0,
	  blending: 1,
	  pt1: 2, /* randomly subsampled points on color blending bins */
	  pt2: 3, /* similar to pt1, but keep at least one in a class */
	  pt3: 4, /* similar to pt2, but represent the minority as triangles */
	  pie1: 5, /* pie charts with grayscale background */
	  pie2: 6, /* pie charts varying size */
	  weaving1: 7, /* weaving with background color of majority class */
	  weaving2: 8, /* weaving that shows density */
	  texture: 9, /* using color and orientation for different classes */
	  attrblk: 10, /* using color and position to encode class identity */
	  bar: 11 /* using bar charts to show proportion of each class within a bin */
};
```
More usage of Binning.js can be seen in `template/index.html`.

# Interaction
Users can change vis type by using the dropdown list.
They can adjust the bin size by changing the value of the slider.
PNG of the current vis will be generated under the current visualization after clicking "generate png" button.
Clicking on the generated image allows you to save the image.

# Notice
1. Rendering more than 5000 points in scatterplot will cause extremely bad rendering performance.
 If you want to have quicker rendering speed, please choose other type of vis first so that you won't get stuck on rendering scatterplots.
2. If there are more than 125k data instances, this app will crash due to call stack size. Alternative way is to set your own data range rather than using the built in calculation.

## Credit
Our original test implementation from [Alper's block](http://bl.ocks.org/yelper/307b1cef7ef792722d4cbde61099a265)
