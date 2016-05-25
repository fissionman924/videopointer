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
        endPointRadius: 4,
        endPointStroke: 2,
        lineColor: "#fff",
        line: {
            color: "#fff",
            width: 2,
            style: "angled",
            angle: 45
        },
        endPoint: {
            radius: 4,
            stroke: 2,
            style: "none",
            strokeColor: "#fff",
            fillColor: "#fff",
            url: ""
        },
        anchorPoint: {
            radius: 4,
            stroke: 2,
            style: "none",
            strokeColor: "#fff",
            fillColor: "#fff",
            url: ""
        },
        videoSelector: "video",
        itemSelector: ".pointer-item",
        anchorSelector: ".pointer-anchor"
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
        var angle = this.options.line.angle;
        var redraw = false;
        //Get location and dimensions for the video container
        var $vid = $(context.options.videoSelector, this.$element);
        var vid = getDims($vid);
        var items = [];
        var selector = context.options.anchorSelector;
        if ($(selector, this.$element).length === 0) {
            selector = context.options.itemSelector;
        }
        $(selector, this.$element).each(function(index, element) {
            var $item = $(element);
            var item = getDims($item);
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

        $(selector, this.$element).each(function(index, element) {
            //Get the corresponding data point based on index
            var currentPoint = context.options.points[index];
            //If no points are defined for the plugin then move along
            if (currentPoint === undefined) {
                return false;
            }

            var vertical = false;
            //Define points (point on video: endPoint, point at anchor icon: anchorPoint, and midPoint)
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

            var $anchor = $(element);
            var anchor = getDims($anchor);
            //If the pointer is originating from above or below the video then make the line go vertical before horizontal
            if (isVertical(vid, anchor)) {
                vertical = true;
                if ($anchor.position().top > vid.y + vid.h) {
                    anchorPoint.y = $anchor.position().top;
                } else {
                    anchorPoint.y = $anchor.position().top + $anchor.outerHeight();
                }
                anchorPoint.x = $anchor.position().left + $anchor.outerWidth() / 2;
            } else {
                if ($anchor.position().left > vid.x + vid.w) {
                    anchorPoint.x = $anchor.position().left;
                } else {
                    anchorPoint.x = $anchor.position().left + $anchor.outerWidth();
                }
                anchorPoint.y = $anchor.position().top + $anchor.outerHeight() / 2;
            }

            //Get the color for the point
            var color = context.options.endPoint.fillColor;
            if (currentPoint.color !== undefined) {
                color = currentPoint.color;
            }

            if (context.options.line.style === "straight") {
                $.extend(midPoint, anchorPoint);
            } else {
                midPoint = calculateAngle(anchorPoint, endPoint, angle, vertical);
            }
            image = drawImage.call(context, context.options.line.style, endPoint, midPoint, anchorPoint, color);

            //Create the image and add it to this pointer item
            if (context.options.itemSelector === selector) {
                $(element).append(image);
            } else {
                $(element).parents(context.options.itemSelector).append(image);
            }
            $(image).css("position", "absolute");

            //Place the image at the correct location based on whether the angle is going down or up
            var vOffset = 1;
            var hOffset = 1;
            if ($(image).height() <= 12) {
                vOffset = (context.options.endPoint.radius + context.options.endPoint.stroke) - Math.abs(anchorPoint.y - endPoint.y);
            }
            if ($(image).width() <= 12) {
                hOffset = (context.options.endPoint.radius + context.options.endPoint.stroke) - Math.abs(anchorPoint.x - endPoint.x);
            }
            var placement = {
                left: 0,
                top: 0
            };
            if (vertical) {
                if (endPoint.x > anchorPoint.x) {
                    placement.left = anchorPoint.x;
                } else {
                    placement.left = anchorPoint.x - image.width;
                }
                if (endPoint.y > anchorPoint.y) {
                    placement.top = anchorPoint.y - vOffset;
                } else {
                    placement.top = anchorPoint.y - image.height + vOffset;
                }
            } else {
                if (endPoint.x > anchorPoint.x) {
                    placement.left = anchorPoint.x;
                } else {
                    placement.left = anchorPoint.x - image.width;
                }
                if (endPoint.y > anchorPoint.y) {
                    placement.top = anchorPoint.y - vOffset;
                } else {
                    placement.top = anchorPoint.y - image.height + vOffset;
                }
            }
            $(image).css({
                "top": placement.top + "px",
                "left": placement.left + "px"
            }).addClass("pointer");
        });
    };

    var getDims = function($elem) {
        var dims = {
            x: $elem.position().left,
            y: $elem.position().top,
            w: $elem.outerWidth(),
            h: $elem.outerHeight()
        };
        return dims;
    };

    var isVertical = function(vid, anchor) {
        var vertical = false;
        if (anchor.x >= vid.x && anchor.x <= vid.x + vid.w && (anchor.y > vid.y + vid.h || anchor.y + anchor.h < vid.y)) {
            vertical = true;
        }
        return vertical;
    };

    var calculateAngle = function(anchorPoint, endPoint, angle, vertical) {
        var midPoint = {
            x: 0,
            y: 0
        };
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
        return midPoint;
    };

    //Create the images of the angled pointers
    var drawImage = function(style, endPoint, midPoint, anchorPoint, color) {
        var image = new Image();
        var endPointRadius = this.options.endPoint.radius;

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
        //For crisp lines adjust the canvas if the line width is an odd number
        if (Math.floor(this.options.line.width) % 2 === 1) {
            var yTranslation = 0.5;
            if (endPoint.y < anchorPoint.y) {
                yTranslation = -0.5;
            }
            drawing.translate(0.5, yTranslation);
        }

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
            points.mid.x = Math.ceil(midPoint.x - anchorPoint.x + 1);
            points.end.x = Math.ceil(endPoint.x - anchorPoint.x + 1);
        } else {
            points.anchor.x = Math.ceil(dims.w - 1);
            points.mid.x = Math.ceil(dims.w - (anchorPoint.x - midPoint.x) - 1);
            points.end.x = Math.ceil(dims.w - (anchorPoint.x - endPoint.x) - 1);
        }
        //Pointer coming from top or bottom?
        if (endPoint.y > anchorPoint.y) {
            points.anchor.y = 1;
            points.mid.y = Math.ceil(midPoint.y - anchorPoint.y + 1);
            points.end.y = Math.ceil(endPoint.y - anchorPoint.y + 1);
        } else if (anchorPoint.y > endPoint.y) {
            points.anchor.y = Math.ceil(dims.h - vOffset - 1);
            points.mid.y = Math.ceil(points.anchor.y - (anchorPoint.y - midPoint.y) - vOffset - 1);
            points.end.y = Math.ceil(dims.h - (anchorPoint.y - endPoint.y) - vOffset - 1);
        }
        if (style === "angled") {
            drawLine(drawing, [points.anchor, points.mid, points.end], this.options.line.width, this.options.line.color);
        } else if (style === "straight") {
            drawLine(drawing, [points.anchor, points.end], this.options.line.width, this.options.line.color);
        } else if (style === "curved") {
            var borderRadius = 100;
            //If it's a right angle then replace the midpoint with two points that create a right angle
            var shortA = {
                    x: 0,
                    y: 0
                },
                shortB = {
                    x: 0,
                    y: 0
                };
            if (points.mid.x === points.anchor.x && points.mid.y === points.end.y) {
                shortA.x = points.anchor.x;
                shortB.y = points.end.y;
                //Make sure border radius is an adequate size
                if (borderRadius > points.mid.y) {
                    borderRadius = points.mid.y;
                }
                if (Math.abs(points.mid.x - points.end.x) < borderRadius) {
                    borderRadius = Math.abs(points.mid.x - points.end.x);
                }
                if (points.anchor.y < points.end.y) {
                    shortA.y = points.mid.y - borderRadius;
                } else {
                    shortA.y = points.mid.y - borderRadius;
                }
                if (points.anchor.x > points.end.x) {
                    shortB.x = points.mid.x - borderRadius;
                } else {
                    shortB.x = points.mid.x + borderRadius;
                }
                drawCurve(drawing, [points.anchor, shortA, shortB, points.end], this.options.line.width, this.options.line.color, vertical);
            } else if (points.mid.y === points.anchor.y && points.mid.x === points.end.x) {
                shortA.y = points.anchor.y;
                shortB.x = points.end.x;
                //Set Border Radius to proper bounds
                if (borderRadius > points.mid.x) {
                    borderRadius = points.mid.x;
                }
                if (Math.abs(points.mid.y - points.end.y) < borderRadius) {
                    borderRadius = Math.abs(points.mid.y - points.end.y);
                }
                if (points.anchor.x < points.end.x) {
                    shortA.x = points.mid.x - borderRadius;
                } else {
                    shortA.x = points.mid.x + borderRadius;
                }
                if (points.anchor.y > points.end.y) {
                    shortB.y = points.mid.y - borderRadius;
                } else {
                    shortB.y = points.mid.y + borderRadius;
                }
                drawCurve(drawing, [points.anchor, shortA, shortB, points.end], this.options.line.width, this.options.line.color, vertical);
            } else {
                drawCurve(drawing, [points.anchor, points.mid, points.end], this.options.line.width, this.options.line.color, vertical);
            }
        }
        if (this.options.endPoint.style === "circle") {
            drawCircle(drawing, points.end, endPointRadius, this.options.endPoint.stroke, color, this.options.endPoint.strokeColor);
        } else if (this.options.endPoint.style === "square") {
            drawSquare(drawing, points.end, endPointRadius, this.options.endPoint.stroke, color, this.options.endPoint.strokeColor);
        }

        image.src = canvas.toDataURL("image/png");
        return image;
    };

    var drawCurve = function(canvas, points, width, color, vertical) {
        canvas.beginPath();
        canvas.strokeStyle = color;
        canvas.lineWidth = width;
        canvas.moveTo(points[0].x, points[0].y);
        var point = {
                x: 0,
                y: 0
            },
            control = {
                x: 0,
                y: 0
            },
            pointBefore = {
                x: 0,
                y: 0
            };
        for (var i = 1; i < points.length; i++) {
            point = points[i];
            pointBefore = points[i - 1];
            if (vertical) {
                control.x = pointBefore.x;
                control.y = point.y;
            } else {
                control.x = point.x;
                control.y = pointBefore.y;
            }
            canvas.quadraticCurveTo(control.x, control.y, point.x, point.y);
        }
        canvas.stroke();
    };

    var drawLine = function(canvas, points, width, color) {
        canvas.beginPath();
        canvas.strokeStyle = color;
        canvas.lineWidth = width;
        canvas.moveTo(points[0].x, points[0].y);
        var point;
        for (var i = 1; i < points.length; i++) {
            point = points[i];
            canvas.lineTo(point.x, point.y);
        }
        canvas.stroke();
    };

    var drawCircle = function(canvas, position, radius, strokeWidth, bgColor, strokeColor) {
        canvas.beginPath();
        canvas.strokeStyle = strokeColor;
        canvas.fillStyle = bgColor;
        canvas.lineWidth = strokeWidth;
        canvas.arc(position.x, position.y, radius, 0, 2 * Math.PI, false);
        if (strokeWidth > 0) {
            canvas.stroke();
        }
        canvas.fill();
    };

    var drawSquare = function(canvas, position, side, strokeWidth, bgColor, strokeColor) {
        canvas.beginPath();
        canvas.strokeStyle = strokeColor;
        canvas.fillStyle = bgColor;
        canvas.lineWidth = strokeWidth;
        if (strokeWidth > 0) {
            canvas.rect(position.x - side / 2, position.y - side / 2, side, side);
            canvas.stroke();
        }
        canvas.fillRect(position.x - side / 2, position.y - side / 2, side, side);
    };

    VideoPointer.prototype.getOptions = function(options) {
        var line, endPoint, anchorPoint;
        if (options.line !== undefined) {
            line = $.extend({}, this.getDefaults().line, options.line);
        }
        if (options.endPoint !== undefined) {
            endPoint = $.extend({}, this.getDefaults().endPoint, options.endPoint);
        }
        if (options.anchorPoint !== undefined) {
            anchorPoint = $.extend({}, this.getDefaults().anchorPoint, options.anchorPoint);
        }
        var opts = $.extend({}, this.getDefaults(), this.$element.data(), options);
        if (line !== undefined) {
            opts.line = line;
        }
        if (endPoint !== undefined) {
            opts.endPoint = endPoint;
        }
        if (anchorPoint !== undefined) {
            opts.anchorPoint = anchorPoint;
        }
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