// MIT License
//
// Copyright for portions of this file are held by Bernard Kobos (2019) as part
// of project gauge.js
//
// All other copyright for this file are held by David Conger (2021)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
// sell copies of the Software, and to permit persons to whom the Software is 
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in 
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//
//
(function() {
    var AnimatedText, AnimatedTextFactory, Bar, BaseDonut, BaseGauge, Donut, Gauge, GaugePointer, TextRenderer, ValueUpdater, addCommas, cutHex, formatNumber, mergeObjects, secondsToString,
      slice = [].slice,
      hasProp = {}.hasOwnProperty,
      extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
      indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
  
    (function() {
      var browserRequestAnimationFrame, isCancelled, j, lastId, len, vendor, vendors;
      vendors = ['ms', 'moz', 'webkit', 'o'];
      for (j = 0, len = vendors.length; j < len; j++) {
        vendor = vendors[j];
        if (window.requestAnimationFrame) {
          break;
        }
        window.requestAnimationFrame = window[vendor + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendor + 'CancelAnimationFrame'] || window[vendor + 'CancelRequestAnimationFrame'];
      }
      browserRequestAnimationFrame = null;
      lastId = 0;
      isCancelled = {};
      if (!requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
          var currTime, id, lastTime, timeToCall;
          currTime = new Date().getTime();
          timeToCall = Math.max(0, 16 - (currTime - lastTime));
          id = window.setTimeout(function() {
            return callback(currTime + timeToCall);
          }, timeToCall);
          lastTime = currTime + timeToCall;
          return id;
        };
        return window.cancelAnimationFrame = function(id) {
          return clearTimeout(id);
        };
      } else if (!window.cancelAnimationFrame) {
        browserRequestAnimationFrame = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback, element) {
          var myId;
          myId = ++lastId;
          browserRequestAnimationFrame(function() {
            if (!isCancelled[myId]) {
              return callback();
            }
          }, element);
          return myId;
        };
        return window.cancelAnimationFrame = function(id) {
          return isCancelled[id] = true;
        };
      }
    })();
  
    secondsToString = function(sec) {
      var hr, min;
      hr = Math.floor(sec / 3600);
      min = Math.floor((sec - (hr * 3600)) / 60);
      sec -= (hr * 3600) + (min * 60);
      sec += '';
      min += '';
      while (min.length < 2) {
        min = '0' + min;
      }
      while (sec.length < 2) {
        sec = '0' + sec;
      }
      hr = hr ? hr + ':' : '';
      return hr + min + ':' + sec;
    };
  
    formatNumber = function() {
      var digits, num, value;
      num = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      value = num[0];
      digits = 0 || num[1];
      return addCommas(value.toFixed(digits));
    };
  
    mergeObjects = function(obj1, obj2) {
      var key, out, val;
      out = {};
      for (key in obj1) {
        if (!hasProp.call(obj1, key)) continue;
        val = obj1[key];
        out[key] = val;
      }
      for (key in obj2) {
        if (!hasProp.call(obj2, key)) continue;
        val = obj2[key];
        out[key] = val;
      }
      return out;
    };
  
    addCommas = function(nStr) {
      var rgx, x, x1, x2;
      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = '';
      if (x.length > 1) {
        x2 = '.' + x[1];
      }
      rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
      }
      return x1 + x2;
    };
  
    cutHex = function(nStr) {
      if (nStr.charAt(0) === "#") {
        return nStr.substring(1, 7);
      }
      return nStr;
    };
  
    ValueUpdater = (function() {
      ValueUpdater.prototype.animationSpeed = 32;
  
      function ValueUpdater(addToAnimationQueue, clear) {
        if (addToAnimationQueue == null) {
          addToAnimationQueue = true;
        }
        this.clear = clear != null ? clear : true;
        if (addToAnimationQueue) {
          AnimationUpdater.add(this);
        }
      }
  
      ValueUpdater.prototype.update = function(force) {
        var diff;
        if (force == null) {
          force = false;
        }
        if (force || this.displayedValue !== this.value) {
          if (this.ctx && this.clear) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          }
          diff = this.value - this.displayedValue;
          if (Math.abs(diff / this.animationSpeed) <= 0.001) {
            this.displayedValue = this.value;
          } else {
            this.displayedValue = this.displayedValue + diff / this.animationSpeed;
          }
          this.render();
          return true;
        }
        return false;
      };
  
      return ValueUpdater;
  
    })();
  
    BaseGauge = (function(superClass) {
      extend(BaseGauge, superClass);
  
      function BaseGauge() {
        return BaseGauge.__super__.constructor.apply(this, arguments);
      }
  
      BaseGauge.prototype.displayScale = 1;
  
      BaseGauge.prototype.forceUpdate = true;
  
      BaseGauge.prototype.setTextField = function(textField, fractionDigits) {
        return this.textField = textField instanceof TextRenderer ? textField : new TextRenderer(textField, fractionDigits);
      };
  
      BaseGauge.prototype.setMinValue = function(minValue, updateStartValue) {
        var gauge, j, len, ref, results;
        this.minValue = minValue;
        if (updateStartValue == null) {
          updateStartValue = true;
        }
        if (updateStartValue) {
          this.displayedValue = this.minValue;
          ref = this.gp || [];
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            gauge = ref[j];
            results.push(gauge.displayedValue = this.minValue);
          }
          return results;
        }
      };
  
      BaseGauge.prototype.setOptions = function(options) {
        if (options == null) {
          options = null;
        }
        this.options = mergeObjects(this.options, options);
        if (this.textField) {
          this.textField.el.style.fontSize = options.fontSize + 'px';
        }
        if (this.options.angle > .5) {
          this.options.angle = .5;
        }
        this.configDisplayScale();
        return this;
      };
  
      BaseGauge.prototype.configDisplayScale = function() {
        var backingStorePixelRatio, devicePixelRatio, height, prevDisplayScale, width;
        prevDisplayScale = this.displayScale;
        if (this.options.highDpiSupport === false) {
          delete this.displayScale;
        } else {
          devicePixelRatio = window.devicePixelRatio || 1;
          backingStorePixelRatio = this.ctx.webkitBackingStorePixelRatio || this.ctx.mozBackingStorePixelRatio || this.ctx.msBackingStorePixelRatio || this.ctx.oBackingStorePixelRatio || this.ctx.backingStorePixelRatio || 1;
          this.displayScale = devicePixelRatio / backingStorePixelRatio;
        }
        if (this.displayScale !== prevDisplayScale) {
          width = this.canvas.G__width || this.canvas.width;
          height = this.canvas.G__height || this.canvas.height;
          this.canvas.width = width * this.displayScale;
          this.canvas.height = height * this.displayScale;
          this.canvas.style.width = width + "px";
          this.canvas.style.height = height + "px";
          this.canvas.G__width = width;
          this.canvas.G__height = height;
        }
        return this;
      };
  
      BaseGauge.prototype.parseValue = function(value) {
        value = parseFloat(value) || Number(value);
        if (isFinite(value)) {
          return value;
        } else {
          return 0;
        }
      };
  
      return BaseGauge;
  
    })(ValueUpdater);
  
    TextRenderer = (function() {
      function TextRenderer(el, fractionDigits1) {
        this.el = el;
        this.fractionDigits = fractionDigits1;
      }
  
      TextRenderer.prototype.render = function(gauge) {
        return this.el.innerHTML = formatNumber(gauge.displayedValue, this.fractionDigits);
      };
  
      return TextRenderer;
  
    })();
  
    AnimatedText = (function(superClass) {
      extend(AnimatedText, superClass);
  
      AnimatedText.prototype.displayedValue = 0;
  
      AnimatedText.prototype.value = 0;
  
      AnimatedText.prototype.setVal = function(value) {
        return this.value = 1 * value;
      };
  
      function AnimatedText(elem1, text) {
        this.elem = elem1;
        this.text = text != null ? text : false;
        AnimatedText.__super__.constructor.call(this);
        if (this.elem === void 0) {
          throw new Error('The element isn\'t defined.');
        }
        this.value = 1 * this.elem.innerHTML;
        if (this.text) {
          this.value = 0;
        }
      }
  
      AnimatedText.prototype.render = function() {
        var textVal;
        if (this.text) {
          textVal = secondsToString(this.displayedValue.toFixed(0));
        } else {
          textVal = addCommas(formatNumber(this.displayedValue));
        }
        return this.elem.innerHTML = textVal;
      };
  
      return AnimatedText;
  
    })(ValueUpdater);
  
    AnimatedTextFactory = {
      create: function(objList) {
        var elem, j, len, out;
        out = [];
        for (j = 0, len = objList.length; j < len; j++) {
          elem = objList[j];
          out.push(new AnimatedText(elem));
        }
        return out;
      }
    };
  
    GaugePointer = (function(superClass) {
      extend(GaugePointer, superClass);
  
      GaugePointer.prototype.displayedValue = 0;
  
      GaugePointer.prototype.value = 0;
  
      GaugePointer.prototype.options = {
        strokeWidth: 0.035,
        length: 0.1,
        color: "#000000",
        iconPath: null,
        iconScale: 1.0,
        iconAngle: 0,
        targ: false
      };
  
      GaugePointer.prototype.img = null;
  
      function GaugePointer(gauge1) {
        this.gauge = gauge1;
        if (this.gauge === void 0) {
          throw new Error('The element isn\'t defined.');
        }
        this.ctx = this.gauge.ctx;
        this.canvas = this.gauge.canvas;
        GaugePointer.__super__.constructor.call(this, false, false);
        this.setOptions();
      }
  
      GaugePointer.prototype.setOptions = function(options) {
        if (options == null) {
          options = null;
        }
        this.options = mergeObjects(this.options, options);
        this.length = 2 * this.gauge.radius * this.gauge.options.radiusScale * this.options.length;
        this.strokeWidth = this.canvas.height * this.options.strokeWidth;
        this.maxValue = this.gauge.maxValue;
        this.minValue = this.gauge.minValue;
        this.animationSpeed = this.gauge.animationSpeed;
        this.options.angle = this.gauge.options.angle;
        if (this.options.iconPath) {
          this.img = new Image();
          return this.img.src = this.options.iconPath;
        }
      };
  
      GaugePointer.prototype.render = function() {
        var angle, endX, endY, imgX, imgY, startX, startY, x, y;
        angle = this.gauge.getAngle.call(this, this.displayedValue);
        x = this.length * Math.cos(angle);
        y = this.length * Math.sin(angle);

        // Draw triangle on perimeter for target value
        if (this.options.targ) {
          var triangle_size = this.strokeWidth/20;
          this.ctx.save();
          this.ctx.translate(x,y);
          this.ctx.rotate(angle + Math.PI / 180.0 * 90);
          this.ctx.beginPath();
          this.ctx.fillStyle = this.options.color;
          this.ctx.shadowColor = '#000000';
          this.ctx.shadowBlur = 1;
          this.ctx.shadowOffsetX = 2;
          this.ctx.shadowOffsetY = 1;
          this.ctx.moveTo(0,0);
          this.ctx.lineTo(triangle_size,-triangle_size);
          this.ctx.lineTo(-triangle_size,-triangle_size);
          this.ctx.fill();
          return this.ctx.restore();
        }

        startX = this.strokeWidth * Math.cos(angle - Math.PI / 2);
        startY = this.strokeWidth * Math.sin(angle - Math.PI / 2);
        endX = this.strokeWidth * Math.cos(angle + Math.PI / 2);
        endY = this.strokeWidth * Math.sin(angle + Math.PI / 2);
        this.ctx.beginPath();
        this.ctx.fillStyle = this.options.color;
        this.ctx.save();
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 1;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(-x/10,-y/10);
        this.ctx.lineTo(endX, endY);
        this.ctx.lineTo(x, y);
        this.ctx.moveTo(startX, startY);
        this.ctx.fill();
        this.ctx.restore();
        if (this.img) {
          imgX = Math.round(this.img.width * this.options.iconScale);
          imgY = Math.round(this.img.height * this.options.iconScale);
          this.ctx.save();
          this.ctx.translate(x, y);
          this.ctx.rotate(angle + Math.PI / 180.0 * (90 + this.options.iconAngle));
          this.ctx.drawImage(this.img, -imgX / 2, -imgY / 2, imgX, imgY);
          return this.ctx.restore();
        }
      };
  
      return GaugePointer;
  
    })(ValueUpdater);
  
    Bar = (function() {
      function Bar(elem1) {
        this.elem = elem1;
      }
  
      Bar.prototype.updateValues = function(arrValues) {
        this.value = arrValues[0];
        this.maxValue = arrValues[1];
        this.avgValue = arrValues[2];
        return this.render();
      };
  
      Bar.prototype.render = function() {
        var avgPercent, valPercent;
        if (this.textField) {
          this.textField.text(formatNumber(this.value));
        }
        if (this.maxValue === 0) {
          this.maxValue = this.avgValue * 2;
        }
        valPercent = (this.value / this.maxValue) * 100;
        avgPercent = (this.avgValue / this.maxValue) * 100;
        $(".bar-value", this.elem).css({
          "width": valPercent + "%"
        });
        return $(".typical-value", this.elem).css({
          "width": avgPercent + "%"
        });
      };
  
      return Bar;
  
    })();
  
    Gauge = (function(superClass) {
      extend(Gauge, superClass);
  
      Gauge.prototype.elem = null;
  
      Gauge.prototype.value = [20];
  
      Gauge.prototype.maxValue = 80;
  
      Gauge.prototype.minValue = 0;
  
      Gauge.prototype.displayedAngle = 0;
  
      Gauge.prototype.displayedValue = 0;
  
      Gauge.prototype.lineWidth = 40;
  
      Gauge.prototype.paddingTop = 0.1;
  
      Gauge.prototype.paddingBottom = 0.1;
  
      Gauge.prototype.percentColors = null;

      Gauge.prototype.conversionMatrix = {
        'm/s': {
          'MPH': 2.23694,
          'KPH': 3.6,
          'm/s': 1
        },
        'MPH': {
          'MPH': 1,
          'KPH': 1.60934,
          'm/s': 0.44704
        },
        'KPH': {
          'MPH': 0.62137119,
          'KPH': 1,
          'm/s': 0.2777777
        }
      }
  
      Gauge.prototype.options = {
        colorStart: "#37abc8ff",
        colorStop: void 0,
        gradientType: 0,
        generateGradient: false,
        highDpiSupport: true,
        strokeColor: "#e0e0e0",
        background: {
          color: '#FFFFFF99', //background color for entire gauge
          scale: 1.5
        },
        pointer: {
          length: 0.7,
          strokeWidth: 0.025,
          color: '#333333DD', //pointer color
          iconScale: 1.0,
          targ: false
        },
        angle: -0.15,
        lineWidth: 0.2,
        radiusScale: 0.85,
        fontSize: 40,
        limitMax: true,
        limitMin: true,
        defaultInputUnits: 'MPH', //input units when none is specified {'m/s','MPH','KPH'}
        primaryDisplayUnits: 'MPH', //units for labels around outside
        maxPrimaryTicks: 10,
        primaryLabels: {
          font: "10px sans-serif",
          labels: [],  //prints labels at these values
          color: "#000000",  // Optional: Label text color
          fractionDigits: 0  // Optional: Numerical precision. 0=round off.
        },
        hidePrimaryLabels: false,
        secondaryDisplayUnits: 'KPH', //units for labels around inside
        maxSecondaryTicks: 7,
        secondaryLabels: {
          font: "9px sans-serif",
          labels: [],  //prints labels at these values
          color: "#000000",  // Optional: Label text color
          fractionDigits: 0  // Optional: Numerical precision. 0=round off.
        },
        secondaryLabelsRadiusOffset: 0.35,
        hideSecondaryLabels: false,
        countBy: {
          'MPH': 5,
          'KPH': 5,
          'm/s': 2
        },
        ticks: {
          divisions: null, //this can be fractional
          divWidth: 1.6,
          divLength: 0.83,
          divColor: '#333333',
          subDivisions: 2,
          subLength: 0.5,
          subWidth: 0.6,
          subColor: '#666666'
        },
        hideTicks: false
      };
  
      function Gauge(canvas) {
        var h, w;
        this.canvas = canvas;
        Gauge.__super__.constructor.call(this);
        this.percentColors = null;
        if (typeof G_vmlCanvasManager !== 'undefined') {
          this.canvas = window.G_vmlCanvasManager.initElement(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        h = this.canvas.clientHeight;
        w = this.canvas.clientWidth;
        this.canvas.height = h;
        this.canvas.width = w;
        this.gp = [new GaugePointer(this)];
        this.setOptions();
      }
  
      Gauge.prototype.setOptions = function(options) {
        var gauge, j, len, phi, ref;
        if (options == null) {
          options = null;
        } else {
          // Check if units have changed
          var input_units_changed = options.defaultInputUnits &&
            (this.options.defaultInputUnits != options.defaultInputUnits);
          var primary_display_units_changed = options.primaryDisplayUnits &&
            (this.options.primaryDisplayUnits != options.primaryDisplayUnits);
          var secondary_display_units_changed = options.secondaryDisplayUnits &&
            (this.options.secondaryDisplayUnits != options.secondaryDisplayUnits);

          // Check if max/min values have changed
          var range_changed = false;
          if (options.maxValue && (this.maxValue != options.maxValue)) {
            this.maxValue = options.maxValue;
            range_changed = true;
          }
          if (options.minValue && (this.minValue != options.minValue)) {
            this.minValue = options.minValue;
            range_changed = true;
          }

          // Check if tick divisions are supplied
          var tick_divs_not_supplied = !options.ticks || !options.ticks.divisions;
        }
        Gauge.__super__.setOptions.call(this, options);
        this.configPercentColors();
        this.extraPadding = 0;
        if (this.options.angle < 0) {
          phi = Math.PI * (1 + this.options.angle);
          this.extraPadding = Math.sin(phi);
        }
        this.availableHeight = this.canvas.height * (1 - this.paddingTop - this.paddingBottom);
        this.lineWidth = this.availableHeight * this.options.lineWidth;
        this.radius = (this.availableHeight - this.lineWidth / 2) / (1.0 + this.extraPadding);

        // If units or range has changed, update labels and ticks
        if (input_units_changed || range_changed) {
          // Generate primary labels
          if (this.options.primaryLabels.labels.length == 0 || primary_display_units_changed) {

            var primary_labels = this.generateLabels(this.options.primaryDisplayUnits,this.options.maxPrimaryTicks);
            this.options.primaryLabels.labels = primary_labels.labels;

            // Set number of divisions to number of primary labels
            if (tick_divs_not_supplied) {
              this.options.ticks.divisions = primary_labels.divs;
            }

          }

          // Generate secondary labels
          if (this.options.secondaryLabels.labels.length == 0 || secondary_display_units_changed) {

            this.options.secondaryLabels.labels =
              this.generateLabels(this.options.secondaryDisplayUnits,this.options.maxSecondaryTicks).labels;

          }
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ref = this.gp;
        for (j = 0, len = ref.length; j < len; j++) {
          gauge = ref[j];
          if (j==0) gauge.setOptions(this.options.pointer);
          gauge.render();
        }
        this.render();
        return this;
      };

      Gauge.prototype.generateLabels = function(display_units,max_number) {
        // Determine number of labels and count-by
        var unit_conversion_scale = this.conversionMatrix[this.options.defaultInputUnits][display_units];
        var display_max = this.maxValue*unit_conversion_scale;
        var num_major_labels = display_max;
        var count_by = this.options.countBy[display_units];
        while (num_major_labels > max_number) {
            num_major_labels = display_max/count_by;
            count_by *= 2;
        }
        count_by /= 2; //undo last *=

        // Populate label array
        var labels = [];
        for (var i = 0; i <= display_max; i+=count_by) {
          if (i == 0) {
            labels.push({
              label: display_units,
              value: i/unit_conversion_scale
            });
          } else {
            labels.push({
              label: i,
              value: i/unit_conversion_scale
            });
          }
        }
        return {labels: labels, divs: num_major_labels};
      };
  
      Gauge.prototype.configPercentColors = function() {
        var bval, gval, i, j, ref, results, rval;
        this.percentColors = null;
        if (this.options.percentColors !== void 0) {
          this.percentColors = new Array();
          results = [];
          for (i = j = 0, ref = this.options.percentColors.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            rval = parseInt((cutHex(this.options.percentColors[i][1])).substring(0, 2), 16);
            gval = parseInt((cutHex(this.options.percentColors[i][1])).substring(2, 4), 16);
            bval = parseInt((cutHex(this.options.percentColors[i][1])).substring(4, 6), 16);
            results.push(this.percentColors[i] = {
              pct: this.options.percentColors[i][0],
              color: {
                r: rval,
                g: gval,
                b: bval
              }
            });
          }
          return results;
        }
      };
  
      Gauge.prototype.set = function(value) {
        var gp, i, j, l, len, m, ref, ref1, val;
        if (!(value instanceof Array)) {
          value = [value];
        }
        for (i = j = 0, ref = value.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
          value[i] = this.parseValue(value[i]);
        }
        if (value.length > this.gp.length) { //add new pointer
          for (i = l = 0, ref1 = value.length - this.gp.length; 0 <= ref1 ? l < ref1 : l > ref1; i = 0 <= ref1 ? ++l : --l) {
            gp = new GaugePointer(this);
            gp.setOptions({
              length: this.options.target_options.distFromCenter,
              strokeWidth: this.options.target_options.sizeScale,
              color: this.options.target_options.color,
              targ: true
            });
            this.gp.push(gp);
          }
        } else if (value.length < this.gp.length) { //remove pointers (last-in, first-out)
          this.gp = this.gp.slice(0,this.gp.length - value.length);
        }
        i = 0;
        for (m = 0, len = value.length; m < len; m++) {
          val = value[m];
          if (val > this.maxValue) {
            if (this.options.limitMax) {
              val = this.maxValue;
            } else {
              this.maxValue = val + 1;
            }
          } else if (val < this.minValue) {
            if (this.options.limitMin) {
              val = this.minValue;
            } else {
              this.minValue = val - 1;
            }
          }
          this.gp[i].value = val;
          this.gp[i++].setOptions({
            minValue: this.minValue,
            maxValue: this.maxValue,
            angle: this.options.angle
          });
        }
        // Use the clamped first element of value as the overall gauge value
        this.value = Math.max(Math.min(value[0], this.maxValue), this.minValue);
        AnimationUpdater.add(this);
        AnimationUpdater.run(this.forceUpdate);
        return this.forceUpdate = false;
      };
  
      Gauge.prototype.getAngle = function(value) {
        return (1 + this.options.angle) * Math.PI + ((value - this.minValue) / (this.maxValue - this.minValue)) * (1 - this.options.angle * 2) * Math.PI;
      };
  
      Gauge.prototype.getColorForPercentage = function(pct, grad) {
        var color, endColor, i, j, rangePct, ref, startColor;
        if (pct === 0) {
          color = this.percentColors[0].color;
        } else {
          color = this.percentColors[this.percentColors.length - 1].color;
          for (i = j = 0, ref = this.percentColors.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
            if (pct <= this.percentColors[i].pct) {
              if (grad === true) {
                startColor = this.percentColors[i - 1] || this.percentColors[0];
                endColor = this.percentColors[i];
                rangePct = (pct - startColor.pct) / (endColor.pct - startColor.pct);
                color = {
                  r: Math.floor(startColor.color.r * (1 - rangePct) + endColor.color.r * rangePct),
                  g: Math.floor(startColor.color.g * (1 - rangePct) + endColor.color.g * rangePct),
                  b: Math.floor(startColor.color.b * (1 - rangePct) + endColor.color.b * rangePct)
                };
              } else {
                color = this.percentColors[i].color;
              }
              break;
            }
          }
        }
        return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
      };
  
      Gauge.prototype.getColorForValue = function(val, grad) {
        var pct;
        pct = (val - this.minValue) / (this.maxValue - this.minValue);
        return this.getColorForPercentage(pct, grad);
      };
  
      Gauge.prototype.renderStaticLabels = function(staticLabels, w, h, radius) {
        var font, fontsize, j, len, match, re, ref, rest, rotationAngle, value;
        this.ctx.save();
        this.ctx.translate(w, h);
        font = staticLabels.font || "10px Times";
        re = /\d+\.?\d?/;
        match = font.match(re)[0];
        rest = font.slice(match.length);
        fontsize = parseFloat(match) * this.displayScale;
        this.ctx.font = fontsize + rest;
        this.ctx.fillStyle = staticLabels.color || "#000000";
        this.ctx.textBaseline = "bottom";
        this.ctx.textAlign = "center";
        ref = staticLabels.labels;
        for (j = 0, len = ref.length; j < len; j++) {
          value = ref[j];
          if (value.label !== void 0) {
            if ((!this.options.limitMin || value.value >= this.minValue) && (!this.options.limitMax || value.value <= this.maxValue)) {
              font = value.font || staticLabels.font;
              match = font.match(re)[0];
              rest = font.slice(match.length);
              fontsize = parseFloat(match) * this.displayScale;
              this.ctx.font = fontsize + rest;
              rotationAngle = this.getAngle(value.value) - 3 * Math.PI / 2;
              this.ctx.rotate(rotationAngle);
              this.ctx.fillText(value.label, 0, -radius - this.lineWidth / 2);
              this.ctx.rotate(-rotationAngle);
            }
          } else {
            if ((!this.options.limitMin || value >= this.minValue) && (!this.options.limitMax || value <= this.maxValue)) {
              rotationAngle = this.getAngle(value) - 3 * Math.PI / 2;
              this.ctx.rotate(rotationAngle);

              // Print units for first tick, otherwise print value
              var label = '';
              if (j==0 && this.options.defaultInputUnits.length > 0) {
                label = this.options.defaultInputUnits;
              } else {
                label = formatNumber(value, staticLabels.fractionDigits);
              }

              this.ctx.fillText(label, 0, -radius - this.lineWidth / 2);
              this.ctx.rotate(-rotationAngle);
            }
          }
        }
        return this.ctx.restore();
      };
  
      Gauge.prototype.renderTicks = function(ticksOptions, w, h, radius) {
        var currentDivision, currentSubDivision, divColor, divLength, divWidth, divisionCount, j, lineWidth, range, rangeDivisions, ref, results, scaleMutate, st, subColor, subDivisions, subLength, subWidth, subdivisionCount, t, tmpRadius;
        if (ticksOptions !== {}) {
          divisionCount = ticksOptions.divisions || 0;
          subdivisionCount = ticksOptions.subDivisions || 0;
          divColor = ticksOptions.divColor || '#fff';
          subColor = ticksOptions.subColor || '#fff';
          divLength = ticksOptions.divLength || 0.7;
          subLength = ticksOptions.subLength || 0.2;
          range = parseFloat(this.maxValue) - parseFloat(this.minValue);
          rangeDivisions = parseFloat(range) / parseFloat(ticksOptions.divisions);
          subDivisions = parseFloat(rangeDivisions) / parseFloat(ticksOptions.subDivisions);
          currentDivision = parseFloat(this.minValue);
          currentSubDivision = 0.0 + subDivisions;
          lineWidth = range / 400;
          divWidth = lineWidth * (ticksOptions.divWidth || 1);
          subWidth = lineWidth * (ticksOptions.subWidth || 1);
          results = [];
          for (t = j = 0, ref = divisionCount + 1; j < ref; t = j += 1) {
            if (currentDivision > this.maxValue) break; //don't draw ticks beyond max
            this.ctx.lineWidth = this.lineWidth * divLength;
            scaleMutate = (this.lineWidth / 2) * (1 - divLength);
            tmpRadius = (this.radius * this.options.radiusScale) + scaleMutate;
            this.ctx.strokeStyle = divColor;

            // Make ticks same color as upper zone if it exists
            if (this.options.upperZone && this.options.upperZone.show && currentDivision > this.options.upperZone.startValue) {
              this.ctx.strokeStyle = this.options.upperZone.color;
            }

            this.ctx.beginPath();
            this.ctx.arc(0, 0, tmpRadius, this.getAngle(currentDivision - divWidth), this.getAngle(currentDivision + divWidth), false);
            this.ctx.stroke();
            currentSubDivision = currentDivision + subDivisions;
            currentDivision += rangeDivisions;
            if (t !== ticksOptions.divisions && subdivisionCount > 0) {
              results.push((function() {
                var l, ref1, results1;
                results1 = [];
                for (st = l = 0, ref1 = subdivisionCount - 1; l < ref1; st = l += 1) {
                  if (currentSubDivision > this.maxValue) break; //don't draw ticks beyond max
                  this.ctx.lineWidth = this.lineWidth * subLength;
                  scaleMutate = (this.lineWidth / 2) * (1 - subLength);
                  tmpRadius = (this.radius * this.options.radiusScale) + scaleMutate;
                  this.ctx.strokeStyle = subColor;
                  this.ctx.beginPath();
                  this.ctx.arc(0, 0, tmpRadius, this.getAngle(currentSubDivision - subWidth), this.getAngle(currentSubDivision + subWidth), false);
                  this.ctx.stroke();
                  results1.push(currentSubDivision += subDivisions);
                }
                return results1;
              }).call(this));
            } else {
              results.push(void 0);
            }
          }
          return results;
        }
      };
  
      Gauge.prototype.render = function() {
        var displayedAngle, fillStyle, gauge, h, j, l, len, len1, max, min, radius, ref, ref1, scaleMutate, tmpRadius, w, zone;
        w = this.canvas.width / 2;
        h = (this.canvas.height * this.paddingTop + this.availableHeight) - ((this.radius + this.lineWidth / 2) * this.extraPadding);
        displayedAngle = this.getAngle(this.displayedValue);
        radius = this.radius * this.options.radiusScale;

        // Draw background
        if (this.options.background) {
          this.ctx.save();
          this.ctx.translate(w, h);
          this.ctx.fillStyle = this.options.background.color;
          this.ctx.beginPath();
          this.ctx.arc(0,0, radius * this.options.background.scale, 0, 2 * Math.PI, false);
          this.ctx.fill();
          this.ctx.restore();
        }

        // Draw text value display
        if (this.textField) {
          this.textField.render(this);
        }
        
        // Draw gauge labels
        if (!this.options.hidePrimaryLabels) {
          this.renderStaticLabels(this.options.primaryLabels, w, h, radius);
        }
        if (!this.options.hideSecondaryLabels) {
          this.renderStaticLabels(this.options.secondaryLabels, w, h, radius*this.options.secondaryLabelsRadiusOffset);
        }

        // Draw gauge zones (tick background)
        this.ctx.lineCap = "butt";
        if (this.options.staticZones) {
          this.ctx.save();
          this.ctx.translate(w, h);
          this.ctx.lineWidth = this.lineWidth;
          ref = this.options.staticZones;
          for (j = 0, len = ref.length; j < len; j++) {
            zone = ref[j];
            min = zone.min;
            if (this.options.limitMin && min < this.minValue) {
              min = this.minValue;
            }
            max = zone.max;
            if (this.options.limitMax && max > this.maxValue) {
              max = this.maxValue;
            }
            tmpRadius = this.radius * this.options.radiusScale;
            if (zone.height) {
              this.ctx.lineWidth = this.lineWidth * zone.height;
              scaleMutate = (this.lineWidth / 2) * (zone.offset || 1 - zone.height);
              tmpRadius = (this.radius * this.options.radiusScale) + scaleMutate;
            }
            this.ctx.strokeStyle = zone.strokeStyle;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, tmpRadius, this.getAngle(min), this.getAngle(max), false);
            this.ctx.stroke();
          }
        } else {
          if (this.options.customFillStyle !== void 0) {
            fillStyle = this.options.customFillStyle(this);
          } else if (this.percentColors !== null) {
            fillStyle = this.getColorForValue(this.displayedValue, this.options.generateGradient);
          } else if (this.options.colorStop !== void 0) {
            if (this.options.gradientType === 0) {
              fillStyle = this.ctx.createRadialGradient(w, h, 9, w, h, 70);
            } else {
              fillStyle = this.ctx.createLinearGradient(0, 0, w, 0);
            }
            fillStyle.addColorStop(0, this.options.colorStart);
            fillStyle.addColorStop(1, this.options.colorStop);
          } else {
            fillStyle = this.options.colorStart;
          }
          this.ctx.strokeStyle = fillStyle;
          this.ctx.beginPath();
          this.ctx.arc(w, h, radius, (1 + this.options.angle) * Math.PI, displayedAngle, false);
          this.ctx.lineWidth = this.lineWidth;
          this.ctx.stroke();
          this.ctx.strokeStyle = this.options.strokeColor;
          this.ctx.beginPath();
          this.ctx.arc(w, h, radius, displayedAngle, (2 - this.options.angle) * Math.PI, false);
          this.ctx.stroke();

          // Draw upper zone (eg, grayed-out region to represent a dynamic max such as WP max speed)
          if (this.options.upperZone && this.options.upperZone.show) {
            this.ctx.strokeStyle = this.options.upperZone.color;
            this.ctx.beginPath();
            this.ctx.arc(w, h, radius, Math.min(Math.max(this.getAngle(this.options.upperZone.startValue),displayedAngle),this.getAngle(this.maxValue)), (2 - this.options.angle) * Math.PI, false);
            this.ctx.stroke();
          }

          this.ctx.save();
          this.ctx.translate(w, h);
        }

        // Draw ticks
        if (!this.options.hideTicks) {
          this.renderTicks(this.options.ticks, w, h, radius);
        }

        this.ctx.restore();

        // Update gauge pointers
        this.ctx.translate(w, h);

        // // Draw text
        // this.ctx.font = 'bold ' + 16*this.displayScale + 'px sans-serif';
        // this.ctx.fillStyle = '#000000'
        // this.ctx.textBaseline = "baseline";
        // this.ctx.textAlign = "right";
        // this.ctx.fillText(formatNumber(this.displayedValue,0),15,h/2-2);
        // this.ctx.font = 7*this.displayScale + 'px sans-serif';
        // this.ctx.fillStyle = '#000000'
        // this.ctx.textBaseline = "baseline";
        // this.ctx.textAlign = "left";
        // this.ctx.fillText('MPH',16,h/2-2);

        ref1 = this.gp;
        for (l = 0, len1 = ref1.length; l < len1; l++) {
          gauge = ref1[l];
          gauge.update(true);
        }
        return this.ctx.translate(-w, -h);
      };
  
      return Gauge;
  
    })(BaseGauge);
  
    BaseDonut = (function(superClass) {
      extend(BaseDonut, superClass);
  
      BaseDonut.prototype.lineWidth = 15;
  
      BaseDonut.prototype.displayedValue = 0;
  
      BaseDonut.prototype.value = 33;
  
      BaseDonut.prototype.maxValue = 80;
  
      BaseDonut.prototype.minValue = 0;
  
      BaseDonut.prototype.options = {
        lineWidth: 0.10,
        colorStart: "#6f6ea0",
        colorStop: "#c0c0db",
        strokeColor: "#eeeeee",
        shadowColor: "#d5d5d5",
        angle: 0.35,
        radiusScale: 1.0
      };
  
      function BaseDonut(canvas) {
        this.canvas = canvas;
        BaseDonut.__super__.constructor.call(this);
        if (typeof G_vmlCanvasManager !== 'undefined') {
          this.canvas = window.G_vmlCanvasManager.initElement(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.setOptions();
        this.render();
      }
  
      BaseDonut.prototype.getAngle = function(value) {
        return (1 - this.options.angle) * Math.PI + ((value - this.minValue) / (this.maxValue - this.minValue)) * ((2 + this.options.angle) - (1 - this.options.angle)) * Math.PI;
      };
  
      BaseDonut.prototype.setOptions = function(options) {
        if (options == null) {
          options = null;
        }
        BaseDonut.__super__.setOptions.call(this, options);
        this.lineWidth = this.canvas.height * this.options.lineWidth;
        this.radius = this.options.radiusScale * (this.canvas.height / 2 - this.lineWidth / 2);
        return this;
      };
  
      BaseDonut.prototype.set = function(value) {
        this.value = this.parseValue(value);
        if (this.value > this.maxValue) {
          if (this.options.limitMax) {
            this.value = this.maxValue;
          } else {
            this.maxValue = this.value;
          }
        } else if (this.value < this.minValue) {
          if (this.options.limitMin) {
            this.value = this.minValue;
          } else {
            this.minValue = this.value;
          }
        }
        AnimationUpdater.add(this);
        AnimationUpdater.run(this.forceUpdate);
        return this.forceUpdate = false;
      };
  
      BaseDonut.prototype.render = function() {
        var displayedAngle, grdFill, h, start, stop, w;
        displayedAngle = this.getAngle(this.displayedValue);
        w = this.canvas.width / 2;
        h = this.canvas.height / 2;
        if (this.textField) {
          this.textField.render(this);
        }
        grdFill = this.ctx.createRadialGradient(w, h, 39, w, h, 70);
        grdFill.addColorStop(0, this.options.colorStart);
        grdFill.addColorStop(1, this.options.colorStop);
        start = this.radius - this.lineWidth / 2;
        stop = this.radius + this.lineWidth / 2;
        this.ctx.strokeStyle = this.options.strokeColor;
        this.ctx.beginPath();
        this.ctx.arc(w, h, this.radius, (1 - this.options.angle) * Math.PI, (2 + this.options.angle) * Math.PI, false);
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = "round";
        this.ctx.stroke();
        this.ctx.strokeStyle = grdFill;
        this.ctx.beginPath();
        this.ctx.arc(w, h, this.radius, (1 - this.options.angle) * Math.PI, displayedAngle, false);
        return this.ctx.stroke();
      };
  
      return BaseDonut;
  
    })(BaseGauge);
  
    Donut = (function(superClass) {
      extend(Donut, superClass);
  
      function Donut() {
        return Donut.__super__.constructor.apply(this, arguments);
      }
  
      Donut.prototype.strokeGradient = function(w, h, start, stop) {
        var grd;
        grd = this.ctx.createRadialGradient(w, h, start, w, h, stop);
        grd.addColorStop(0, this.options.shadowColor);
        grd.addColorStop(0.12, this.options._orgStrokeColor);
        grd.addColorStop(0.88, this.options._orgStrokeColor);
        grd.addColorStop(1, this.options.shadowColor);
        return grd;
      };
  
      Donut.prototype.setOptions = function(options) {
        var h, start, stop, w;
        if (options == null) {
          options = null;
        }
        Donut.__super__.setOptions.call(this, options);
        w = this.canvas.width / 2;
        h = this.canvas.height / 2;
        start = this.radius - this.lineWidth / 2;
        stop = this.radius + this.lineWidth / 2;
        this.options._orgStrokeColor = this.options.strokeColor;
        this.options.strokeColor = this.strokeGradient(w, h, start, stop);
        return this;
      };
  
      return Donut;
  
    })(BaseDonut);
  
    window.AnimationUpdater = {
      elements: [],
      animId: null,
      addAll: function(list) {
        var elem, j, len, results;
        results = [];
        for (j = 0, len = list.length; j < len; j++) {
          elem = list[j];
          results.push(AnimationUpdater.elements.push(elem));
        }
        return results;
      },
      add: function(object) {
        if (indexOf.call(AnimationUpdater.elements, object) < 0) {
          return AnimationUpdater.elements.push(object);
        }
      },
      run: function(force) {
        var elem, finished, isCallback, j, k, l, len, ref, toRemove;
        if (force == null) {
          force = false;
        }
        isCallback = isFinite(parseFloat(force));
        if (isCallback || force === true) {
          finished = true;
          toRemove = [];
          ref = AnimationUpdater.elements;
          for (k = j = 0, len = ref.length; j < len; k = ++j) {
            elem = ref[k];
            if (elem.update(force === true)) {
              finished = false;
            } else {
              toRemove.push(k);
            }
          }
          for (l = toRemove.length - 1; l >= 0; l += -1) {
            k = toRemove[l];
            AnimationUpdater.elements.splice(k, 1);
          }
          return AnimationUpdater.animId = finished ? null : requestAnimationFrame(AnimationUpdater.run);
        } else if (force === false) {
          if (AnimationUpdater.animId === !null) {
            cancelAnimationFrame(AnimationUpdater.animId);
          }
          return AnimationUpdater.animId = requestAnimationFrame(AnimationUpdater.run);
        }
      }
    };
  
    if (typeof window.define === 'function' && (window.define.amd != null)) {
      define(function() {
        return {
          Gauge: Gauge,
          Donut: Donut,
          BaseDonut: BaseDonut,
          TextRenderer: TextRenderer
        };
      });
    } else if (typeof module !== 'undefined' && (module.exports != null)) {
      module.exports = {
        Gauge: Gauge,
        Donut: Donut,
        BaseDonut: BaseDonut,
        TextRenderer: TextRenderer
      };
    } else {
      window.Gauge = Gauge;
      window.Donut = Donut;
      window.BaseDonut = BaseDonut;
      window.TextRenderer = TextRenderer;
    }
  
  }).call(this);
  
  //# sourceMappingURL=gauge.js.map