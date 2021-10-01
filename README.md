gauge.js
========

100% native, animated JavaScript vehicle gauges.

 * No images, no external CSS - pure canvas
 * No dependencies
 * Highly configurable
 * Resolution independent
 * Animated gauge value changes
 * Works in all major browsers
 * MIT License

## Usage

```javascript
var gauge_opts = {
    angle: -0.15, //span of the gauge arc
    lineWidth: 0.2, //tick background line thickness
    radiusScale: 0.85, //relative radius
    pointer: {
        length: 0.7, //pointer length relative to gauge radius
        strokeWidth: 0.025, //pointer thickness
        color: '#333333DD' //pointer color
    },
    target_options: {
        distFromCenter: 0.63,
        sizeScale: 1,
        color: '#00445599'    
    },
    background: {
        color: '#FFFFFF99', //background color for entire gauge
        scale: 1.5
    },
    limitMax: true,     //if false, max value increases automatically if value > maxValue
    limitMin: true,     //if true, the min value of the gauge will be fixed
    colorStart: '#37abc8ff',   //tick background color
    colorStop: '#37abc8ff',
    strokeColor: '#E0E0E0',  //tick background color
    generateGradient: false,
    highDpiSupport: true     //high resolution support
};
var target = document.getElementById('foo'); // your canvas element
var gauge = new Gauge(target).setOptions(gauge_opts); // create sexy gauge!
gauge.maxValue = 13.5; // set max gauge value
gauge.setMinValue(0);  // set min value
gauge.set(8); // set actual value
```
