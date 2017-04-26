# Binning
Exploration of different designs of binning (A survey)

Link to paper-preprint coming soon...

# Usage
You can choose your own dataset from Browse button. 
Note that we only implement the front-end part. 
Due to browser security issue, it cannot get the full path of the file.
Thus, your file should be in the same directory of texture.html.
Users can change vis type by using the dropdown list.
They can adjust the bin size by changing the value of the slider.
PNG of the current vis will be generated under the current visualization after clicking "generate png" button.
Clicking on the generated image allows you to save the image.
The generated image will be slightly cropped on the top side and right side.

Alternatively, users can directly use ```Binning.draw(filename, vistype, binSize)``` to draw a specific one they like.
Note that if you are trying to pull out only the draw function, ```filename``` and ```vistype``` are required.
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
	  texture: 9 /* using color and orientation for different classes */
};
```

## Credit
Our original test implementation from [Alper's block](http://bl.ocks.org/yelper/307b1cef7ef792722d4cbde61099a265)
