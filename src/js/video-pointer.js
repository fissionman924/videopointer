/**
 * @license Copyright 2016 Nathaniel Lord
 */
(function($) {
    'use strict';

    // Required for trig functions: Converts from degrees to radians.
    Math.radians = function(degrees) {
        return degrees * Math.PI / 180;
    };

    //Declare and initialize the plugin
    var VideoPointer = function(element, options) {
        this.$element = null;
        this.options = null;
        this.init(element, options);
    };

    //Plugin defaults - Can be overridden in the properties passed into the plugin
    VideoPointer.DEFAULTS = {
        initialized: false,
        angle: 45,
        endPointRadius: 4,
        endPointStroke: 2,
        lineColor: "#fff",
        videoSelector: "video",
        itemSelector: ".pointer-item",
        expanderSelector: ".pointer-expander"
    };

    //Initialization function
    VideoPointer.prototype.init = function(element, options) {
        var context = this;
        this.$element = $(element);
        this.options = this.getOptions(options);
        this.state = {};
        //Generate and append the images
        this.generatePoints.apply(this);
        //Add event listeners
        this.$element.on("mouseenter focus", context.options.itemSelector, function(event) {
            var index = $(context.options.itemSelector, context.$element).index(event.currentTarget);
            var time = context.options.points[index].time;
            var video = $(context.options.videoSelector, context.$element)[0];
            if (time === undefined) {
                return false;
            }
            video.currentTime = time;
            if (!video.paused) {
                video.pause();
            }
        }).on("mouseleave blur", context.options.itemSelector, function(event) {
            var video = $(context.options.videoSelector, context.$element)[0];
            if (video.paused) {
                video.play();
            }
        });
        $(window).on("resize", function(event) {
            context.generatePoints.apply(context);
        });
        $(context.options.videoSelector, this.$element).on("canplay", function(event) {
            context.generatePoints.apply(context);
        });
    };

    //Simple function for comparing the values on two objects for equality based on type and values
    var isEqual = function(objA, objB) {
        var i;
        if (typeof objA !== typeof objB) {
            return false;
        } else if (objA === null || objB === null && objA !== objB) {
            return false;
        } else if (Array.isArray(objA)) {
            if (objA.length != objB.length) {
                return false;
            }
            objA.sort();
            objB.sort();
            for (i = 0; i < objA.length; i++) {
                if (!isEqual(objA[i], objB[i])) {
                    return false;
                }
            }
        } else if (typeof objA === "object") {
            var keysA = Object.keys(objA);
            var keysB = Object.keys(objB);
            if (!isEqual(keysA, keysB)) {
                return false;
            }
            for (i = 0; i < keysA.length; i++) {
                if (!isEqual(objA[keysA[i]], objB[keysB[i]])) {
                    return false;
                }
            }
        } else {
            return objA === objB;
        }
        return true;
    };

    VideoPointer.prototype.clearImages = function() {
        $(".pointer", this.$element).replaceWith("");
    };

    VideoPointer.prototype.rerender = function() {
        //Clear the state so new points can be generated
        this.state = {};
        //Clear out existing images
        this.clearImages.apply(this);
        //Create new images
        this.generatePoints.apply(this);
    };

    //Perform points calculations and add images
    VideoPointer.prototype.generatePoints = function() {
        var context = this;
        var points = this.options.points;
        var angle = this.options.angle;
        var redraw = false;
        //Get location and dimensions for the video container
        var $vid = $(context.options.videoSelector, this.$element);
        var vid = {
            x: $vid.position().left,
            y: $vid.position().top,
            w: $vid.width(),
            h: $vid.height()
        };
        var items = [];
        $(context.options.expanderSelector, this.$element).each(function(index, element) {
            var $item = $(element);
            var item = {
                x: $item.position().left,
                y: $item.position().top,
                w: $item.width(),
                h: $item.outerHeight()
            };
            items.push(item);
        });
        //Check to see if there are any changes in the size or position of the key elements
        if (context.state.vid === undefined || context.state.items === undefined || !isEqual(context.state.vid, vid) || !isEqual(context.state.items, items)) {
            context.state.vid = vid;
            context.state.items = items;
            context.clearImages.apply(context);
            redraw = true;
        }
        if (!redraw) {
            return;
        }

        var image;

        $(context.options.expanderSelector, this.$element).each(function(index, element) {
            //Get the corresponding data point based on index
            var currentPoint = context.options.points[index];
            //If no points are defined for the plugin then move along
            if (currentPoint === undefined) {
                return false;
            }

            var vertical = false;
            //Define points (point on video: endPoint, point at expander icon: anchorPoint, and midPoint)
            var endPoint = {
                x: 0,
                y: 0
            };
            var anchorPoint = {
                x: 0,
                y: 0
            };
            var midPoint = {
                x: 0,
                y: 0
            };

            //Get the location on the video we're interested in
            endPoint.x = (currentPoint.x / 100) * vid.w + vid.x;
            endPoint.y = (currentPoint.y / 100) * vid.h + vid.y;

            //Find the absolute position of the expander icon on the page
            var $expander = $(element);
            anchorPoint.x = $expander.position().left;
            anchorPoint.y = $expander.position().top + $expander.outerHeight() / 2;
            //If the pointer is originating from above or below the video then make the line go vertical before horizontal
            if ($expander.position().left >= vid.x && $expander.position().left <= vid.x + vid.w && ($expander.position().top > vid.y + vid.h || $expander.position().top + $expander.outerHeight() < vid.y)) {
                vertical = true;
            }

            //Solve for the sides of the imaginary triangle so we can angle the pointer
            var angles = {
                A: angle,
                B: 90,
                C: 180 - angle - 90
            };
            var sides = {
                a: Math.abs(endPoint.y - anchorPoint.y),
                b: 0,
                c: 0
            };
            if (vertical) {
                sides.a = Math.abs(endPoint.x - anchorPoint.x);
            }
            sides.b = sides.a * Math.sin(Math.radians(angles.B)) / Math.sin(Math.radians(angles.A));
            sides.c = sides.a * Math.sin(Math.radians(angles.C)) / Math.sin(Math.radians(angles.A));

            if (vertical) {
                if (endPoint.y > anchorPoint.y) {
                    midPoint.y = endPoint.y - sides.c;
                } else {
                    midPoint.y = endPoint.y + sides.c;
                }
                //Determine if we can stick with the predefined angle or if we need to switch to a 90 degree angle based on proximity
                if (Math.abs(endPoint.y - anchorPoint.y) < Math.abs(endPoint.x - anchorPoint.x)) {
                    midPoint.y = endPoint.y;
                }
                midPoint.x = anchorPoint.x;
            } else {
                if (endPoint.x > anchorPoint.x) {
                    midPoint.x = endPoint.x - sides.c;
                } else {
                    midPoint.x = endPoint.x + sides.c;
                }
                //Determine if we can stick with the predefined angle or if we need to switch to a 90 degree angle based on proximity
                if (Math.abs(endPoint.x - anchorPoint.x) < Math.abs(endPoint.y - anchorPoint.y)) {
                    midPoint.x = endPoint.x;
                }
                midPoint.y = anchorPoint.y;
            }


            //Create the image and add it to this pointer item
            image = null;
            image = drawAngle.call(context, endPoint, midPoint, anchorPoint, currentPoint.color);
            $(element).parents(context.options.itemSelector).append(image);
            $(image).css("position", "absolute");

            //Place the image at the correct location based on whether the angle is going down or up
            var vOffset = 1;
            if ($(image).height() <= 12) {
                vOffset = (context.options.endPointRadius + context.options.endPointStroke) - Math.abs(anchorPoint.y - endPoint.y);
            }

            if (endPoint.x > anchorPoint.x) {
                $(image).css({
                    "left": anchorPoint.x + "px"
                });
            } else {
                $(image).css({
                    "left": anchorPoint.x - image.width + "px"
                });
            }
            if (endPoint.y > anchorPoint.y) {
                $(image).css({
                    "top": anchorPoint.y - vOffset + "px"
                });
            } else {
                $(image).css({
                    "top": anchorPoint.y - image.height + vOffset + "px"
                });
            }
            $(image).addClass("pointer");
        });
    };

    //Create the images of the angled pointers
    var drawAngle = function(endPoint, midPoint, anchorPoint, color) {
        var image = new Image();
        var endPointRadius = this.options.endPointRadius;

        if (midPoint.x !== endPoint.x && Math.abs(midPoint.x - endPoint.x) !== Math.abs(midPoint.y - endPoint.y)) {
            console.log(endPoint, midPoint);
        }

        var points = {
            anchor: {},
            mid: {},
            end: {}
        };

        var vertical = (anchorPoint.x === midPoint.x && anchorPoint.y !== midPoint.y);

        //Get 
        var dims = {
            w: Math.ceil(Math.abs(anchorPoint.x - endPoint.x) + endPointRadius + 6),
            h: Math.ceil(Math.abs(endPoint.y - anchorPoint.y) + endPointRadius + 6)
        };
        //Create the canvas element in memory and define its dimensions
        var canvas = document.createElement("canvas");
        canvas.height = dims.h;
        canvas.width = dims.w;
        //Get the element for drawing
        var drawing = canvas.getContext("2d");

        //Add an offset if the vertical difference in points is minimal
        var vOffset = 0;
        if (Math.abs(anchorPoint.y - endPoint.y) <= endPointRadius) {
            vOffset = (endPointRadius + 2) - Math.abs(anchorPoint.y - endPoint.y);
            if (vOffset < 0) {
                vOffset = 0;
            }
        }
        //Pointer coming from right or left?
        if (endPoint.x > anchorPoint.x) {
            points.anchor.x = 1;
            points.mid.x = midPoint.x - anchorPoint.x + 1;
            points.end.x = endPoint.x - anchorPoint.x + 1;
        } else {
            points.anchor.x = dims.w - 1;
            points.mid.x = dims.w - (anchorPoint.x - midPoint.x) - 1;
            points.end.x = dims.w - (anchorPoint.x - endPoint.x) - 1;
        }
        //Pointer coming from top or bottom?
        if (endPoint.y > anchorPoint.y) {
            points.anchor.y = 1;
            points.mid.y = 1;
            points.end.y = endPoint.y - midPoint.y;
        } else if (anchorPoint.y > endPoint.y) {
            points.anchor.y = dims.h - vOffset - 1;
            points.mid.y = points.anchor.y - (anchorPoint.y - midPoint.y) - vOffset - 1;
            points.end.y = dims.h - (anchorPoint.y - endPoint.y) - vOffset - 1;
        }

        drawLine(drawing, points.anchor, points.mid, 2, this.options.lineColor);
        drawLine(drawing, points.mid, points.end, 2, this.options.lineColor);
        drawCircle(drawing, points.end, endPointRadius, 2, color, this.options.lineColor);

        image.src = canvas.toDataURL("image/png");
        return image;
    };

    var drawLine = function(canvas, from, to, width, color) {
        canvas.beginPath();
        canvas.strokeStyle = color;
        canvas.lineWidth = width;
        canvas.moveTo(from.x, from.y);
        canvas.lineTo(to.x, to.y);
        canvas.stroke();
    };

    var drawCircle = function(canvas, position, radius, strokeWidth, bgColor, strokeColor) {
        canvas.beginPath();
        canvas.strokeStyle = strokeColor;
        canvas.fillStyle = bgColor;
        canvas.lineWidth = strokeWidth;
        canvas.arc(position.x, position.y, radius, 0, 2 * Math.PI, false);
        canvas.stroke();
        canvas.fill();
    };

    VideoPointer.prototype.getOptions = function(options) {
        var opts = $.extend({}, this.getDefaults(), this.$element.data(), options);
        return opts;
    };

    VideoPointer.prototype.getDefaults = function() {
        return VideoPointer.DEFAULTS;
    };

    VideoPointer.prototype.destroy = function() {
        delete this.options;
        delete this.$element;
    };

    function Plugin(option, args) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('videopointer');
            var options = typeof option == 'object' && option;

            if (!data) $this.data('videopointer', (data = new VideoPointer(this, options)));
            if (typeof option == 'string') data[option](args);
        });
    }

    var old = $.fn.videopointer;

    $.fn.videopointer = Plugin;
    $.fn.videopointer.Constructor = VideoPointer;

    // VideoSlider NO CONFLICT
    // ===================	
    $.fn.videopointer.noConflict = function() {
        $.fn.videopointer = old;
        return this;
    };

}(jQuery));