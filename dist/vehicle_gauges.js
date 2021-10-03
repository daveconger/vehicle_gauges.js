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

(function() {
    var BaseGauge, Gauge, GaugePointer, TextRenderer, ValueUpdater, addCommas, cutHex, formatNumber, mergeObjects,
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
        if (force == null) {
          force = false;
        }

        if (this.gp) {
          this.gp.forEach(function(gp) {
            force = force || gp.displayedValue !== gp.value;
          });
        }

        if (force || this.displayedValue !== this.value) {
          if (this.ctx && this.clear) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          }
          var diff = this.value - this.displayedValue;
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
        this.length = this.gauge.height * this.options.length/2;
        this.strokeWidth = this.gauge.height * this.options.strokeWidth;
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
  
    Gauge = (function(superClass) {
      extend(Gauge, superClass);
  
      Gauge.prototype.elem = null;
      Gauge.prototype.height = 200;
      Gauge.prototype.value = 20;  
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
        strokeColor: "#e0e0e0", //tick background color
        lineWidth: 0.12, //tick background width
        background: {
          color: '#FFFFFF99', //background color for entire gauge
          scale: 1
        },
        pointer: {
          length: 0.95,
          strokeWidth: 0.02,
          color: '#333333DD', //pointer color
          iconScale: 1.0,
          targ: false
        },
        angle: -0.15,
        scale: 1,
        fontSize: 40,
        limitMax: true,
        limitMin: true,
        defaultInputUnits: 'MPH', //input units when none is specified {'m/s','MPH','KPH'}
        primaryDisplayUnits: 'MPH', //units for labels around outside
        maxPrimaryTicks: 10,
        primaryLabels: {
          font: "7.5px sans-serif",
          labels: [],  //prints labels at these values
          color: "#000000",  // Optional: Label text color
          fractionDigits: 0  // Optional: Numerical precision. 0=round off.
        },
        hidePrimaryLabels: false,
        secondaryDisplayUnits: 'KPH', //units for labels around inside
        maxSecondaryTicks: 7,
        secondaryLabels: {
          font: "6.5px sans-serif",
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
        hideTicks: false,
        hideTextDisplay: false
      };
  
      function Gauge(canvas) {
        this.canvas = canvas;
        Gauge.__super__.constructor.call(this);
        this.percentColors = null;
        if (typeof G_vmlCanvasManager !== 'undefined') {
          this.canvas = window.G_vmlCanvasManager.initElement(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvas.height = this.canvas.clientHeight;
        this.canvas.width = this.canvas.clientWidth;
        this.gp = [new GaugePointer(this)];
        this.setOptions();
      }
  
      Gauge.prototype.setOptions = function(options) {
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
          var phi = Math.PI * (1 + this.options.angle);
          this.extraPadding = Math.sin(phi);
        }
        
        this.height = this.canvas.height * this.options.scale;
        this.lineWidth = this.height * this.options.lineWidth;
        this.radius = 0.77*(this.height - this.lineWidth)/2;

        // Determine origin (gauge rotation center)
        if (!this.options.originX) {
          this.originX = this.canvas.width/2;
        } else {
          this.originX = this.options.originX;
        }
        if (!this.options.originY) {
          this.originY = this.canvas.height/2;
        } else {
          this.originY = this.options.originY;
        }

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

        if (this.gp && this.gp.length) {
          this.gp[0].setOptions(this.options.pointer);
        }

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

      Gauge.prototype.parseValueUpdateRanges = function(value,units) {
        // Parse and convert value
        value = this.parseValue(value)
        if (units) {
          value *= this.conversionMatrix[units][this.options.defaultInputUnits];
        }

        // Clamp to or adjust max and min values
        if (value > this.maxValue) {
          if (this.options.limitMax) {
            value = this.maxValue;
          } else {
            this.maxValue = value + 1;
          }
        } else if (value < this.minValue) {
          if (this.options.limitMin) {
            value = this.minValue;
          } else {
            this.minValue = value - 1;
          }
        }
        return value;
      };

      Gauge.prototype.setTargetSpeed = function(value,units) {
        // Remove target pointer if no value and force update
        if (value !== 0 && !value && this.gp.length > 1) {
          this.gp = this.gp.slice(0,1);
          this.forceUpdate = true;
        } else {
          // Add new target pointer if it doesn't exist
          if (this.gp.length == 1) {
            var gp = new GaugePointer(this);
            gp.setOptions({
              length: this.options.target_options.distFromCenter,
              strokeWidth: this.options.target_options.sizeScale,
              color: this.options.target_options.color,
              targ: true
            });
            this.gp.push(gp);
          }
          
          // Parse and convert value
          value = this.parseValueUpdateRanges(value,units);

          // Update pointer
          this.gp[1].value = value;
          this.gp[1].setOptions({
            minValue: this.minValue,
            maxValue: this.maxValue,
            angle: this.options.angle
          });
        }

        AnimationUpdater.add(this);
        AnimationUpdater.run(this.forceUpdate);
        return this.forceUpdate = false;
      };
  
      Gauge.prototype.setSpeed = function(value,units) {
        // Parse and convert value
        value = this.parseValueUpdateRanges(value,units);

        // Update overall gauge value
        this.value = value;

        // Update pointer
        this.gp[0].value = value;
        this.gp[0].setOptions({
          minValue: this.minValue,
          maxValue: this.maxValue,
          angle: this.options.angle
        });

        AnimationUpdater.add(this);
        AnimationUpdater.run(this.forceUpdate);
        return this.forceUpdate = false;
      };

      Gauge.prototype.setLimitSpeed = function(value,units) {
        if (value !== 0 && !value) {
          this.setOptions({
            upperZone: {
                show: false
            }
          });
        } else {
          value = this.parseValueUpdateRanges(value,units);
          this.setOptions({
            upperZone: {
                show: true,
                startValue: value,
                color: '#666666'
            }
          });
        }
        this.update(true);
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
        font = staticLabels.font || "10px sans-serif";
        re = /\d+\.?\d?/;
        match = font.match(re)[0];
        rest = font.slice(match.length);
        fontsize = parseFloat(match) * this.displayScale * this.height/200;
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
              fontsize = parseFloat(match) * this.displayScale * this.height/200;
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
            tmpRadius = this.radius + scaleMutate;
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
                  tmpRadius = this.radius + scaleMutate;
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
        var fillStyle, j, len, max, min, ref, scaleMutate, tmpRadius, zone;
        var w = this.originX;
        var h = this.originY;
        var displayedAngle = this.getAngle(this.displayedValue);
        var radius = this.radius;

        // Draw background
        if (this.options.background) {
          this.ctx.save();
          this.ctx.translate(w, h);
          this.ctx.fillStyle = this.options.background.color;
          this.ctx.beginPath();
          this.ctx.arc(0,0, this.height*this.options.background.scale/2, 0, 2 * Math.PI, false);
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
          this.renderStaticLabels(this.options.secondaryLabels, w, h, radius-1.6*this.lineWidth);
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
            tmpRadius = radius;
            if (zone.height) {
              this.ctx.lineWidth = this.lineWidth * zone.height;
              scaleMutate = (this.lineWidth / 2) * (zone.offset || 1 - zone.height);
              tmpRadius = radius + scaleMutate;
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

          // Draw upper zone (eg, grayed-out region to represent a dynamic max such as a speed limit)
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

        // Draw text
        if (!this.options.hideTextDisplay) {
          var unit_conversion_scale = this.conversionMatrix[this.options.defaultInputUnits][this.options.primaryDisplayUnits];
          this.ctx.font = 'bold ' + 15*this.displayScale*this.height/200 + 'px sans-serif';
          this.ctx.fillStyle = '#000000'
          this.ctx.textBaseline = "baseline";
          this.ctx.textAlign = "right";
          this.ctx.fillText(formatNumber(this.displayedValue*unit_conversion_scale,0),15*this.height/200,this.height*0.245);
          this.ctx.font = 5*this.displayScale*this.height/200 + 'px sans-serif';
          this.ctx.fillStyle = '#000000'
          this.ctx.textBaseline = "baseline";
          this.ctx.textAlign = "left";
          this.ctx.fillText(this.options.primaryDisplayUnits,17*this.height/200,this.height*0.245);
        }

        this.gp.forEach(function(gp) {
          gp.update(true);
        });
        
        return this.ctx.translate(-w, -h);
      };
  
      return Gauge;
  
    })(BaseGauge);
  
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
          TextRenderer: TextRenderer
        };
      });
    } else if (typeof module !== 'undefined' && (module.exports != null)) {
      module.exports = {
        Gauge: Gauge,
        TextRenderer: TextRenderer
      };
    } else {
      window.Gauge = Gauge;
      window.TextRenderer = TextRenderer;
    }
  
  }).call(this);