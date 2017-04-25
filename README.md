# Binning
Exploration of different designs of binning (A survey)

Link to paper-preprint coming soon...

# Usage
You can choose your own dataset  from Browse button. 
Note that we only implement the front-end part. 
Due to browser security issue, it cannot get the full path of the file.
Thus, your file should be in the same directory of texture.html.
Users can change vis type by using the dropdown list.
They can adjust the bin size by changing the value of the slider.

Alternatively, users can directly use ```draw(filename, vistype, binSize)``` to draw a specific one they like.
Note that if you are trying to pull out only the draw function, filename and vistype is required.
The following are the enumeration of different vis type:
```
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
```

## Credit
Our original test implementation from [Alper's block](http://bl.ocks.org/yelper/307b1cef7ef792722d4cbde61099a265)
