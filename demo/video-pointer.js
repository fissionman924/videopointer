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

    var images = {};

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
            radius: 0,
            stroke: 0,
            style: "none",
            strokeColor: "#fff",
            fillColor: "#fff",
            url: ""
        },
        anchorPoint: {
            radius: 0,
            stroke: 0,
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
        var $vid = $($(context.options.videoSelector, this.$element)[0]);
        var vid = getAbsoluteDims($vid);
        var items = [];
        var selector = getSelector.apply(this);
        $(selector, this.$element).each(function(index, element) {
            var $item = $(element);
            var item = getAbsoluteDims($item);
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
            var anchor = getAbsoluteDims($anchor);
            //If the pointer is originating from above or below the video then make the line go vertical before horizontal
            if (isVertical(vid, anchor)) {
                vertical = true;
                if (anchor.y > vid.y + vid.h) {
                    anchorPoint.y = anchor.y;
                } else {
                    anchorPoint.y = anchor.y + anchor.h;
                }
                anchorPoint.x = anchor.x + anchor.w / 2;
            } else {
                if ($anchor.position().left > vid.x + vid.w) {
                    anchorPoint.x = anchor.x;
                } else {
                    anchorPoint.x = anchor.x + anchor.w;
                }
                anchorPoint.y = anchor.y + anchor.h / 2;
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
            drawImage.call(context, currentPoint, endPoint, midPoint, anchorPoint, color, function(image) {
                placeImage.call(context, currentPoint, element, anchorPoint, getDims($anchor), endPoint, vertical, image);
            });
        });
    };

    var getSelector = function() {
        var selector = this.options.anchorSelector;
        if ($(selector, this.$element).length === 0) {
            selector = this.options.itemSelector;
        }
        return selector;
    };

    var placeImage = function(pointProps, element, anchorPoint, relativeAnchor, endPoint, vertical, image) {
        var context = this;

        var endProps = $.extend(true, {}, this.options.endPoint, pointProps.endPoint);
        var anchorProps = $.extend(true, {}, this.options.anchorPoint, pointProps.anchorPoint);
        var lineProps = $.extend(true, {}, this.options.line, pointProps.line);

        var selector = getSelector.apply(this);
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
        var minimumOffset = endProps.radius > anchorProps.radius ? endProps.radius * 2 : anchorProps.radius;
        if ($(image).height() <= minimumOffset) {
            vOffset = (endProps.radius + endProps.stroke) - Math.abs(anchorPoint.y - endPoint.y);
        } else {
            vOffset += anchorProps.radius;
        }
        if ($(image).width() <= minimumOffset) {
            hOffset = (endProps.radius + endProps.stroke) - Math.abs(anchorPoint.x - endPoint.x);
        } else {
            hOffset += anchorProps.radius;
        }
        var placement = {
            left: 0,
            top: 0
        };
        if (vertical) {
            if (endPoint.x > anchorPoint.x) {
                placement.left = relativeAnchor.x;
            } else {
                placement.left = relativeAnchor.x - image.width;
            }
            if (endPoint.y > anchorPoint.y) {
                placement.top = relativeAnchor.y - vOffset;
            } else {
                placement.top = relativeAnchor.y - image.height + vOffset;
            }
        } else {
            if (endPoint.x > anchorPoint.x) {
                placement.left = relativeAnchor.x;
            } else {
                placement.left = relativeAnchor.x - image.width;
            }
            if (endPoint.y > anchorPoint.y) {
                placement.top = relativeAnchor.y - vOffset + relativeAnchor.h / 2;
            } else {
                placement.top = relativeAnchor.y - image.height + vOffset + relativeAnchor.h / 2;
            }
        }
        $(image).css({
            "top": placement.top + "px",
            "left": placement.left + "px"
        }).addClass("pointer");
    };

    var getAbsoluteDims = function($elem) {
        var dims = {
            x: $elem.offset().left + parseInt($elem.css("padding-left")) + parseInt($elem.css("border-left-width")),
            y: $elem.offset().top + parseInt($elem.css("padding-top")) + parseInt($elem.css("border-top-width")),
            w: $elem.width(),
            h: $elem.height()
        };
        return dims;
    };

    var getDims = function($elem) {
        var dims = {
            x: $elem.position().left + parseInt($elem.css("padding-left")) + parseInt($elem.css("border-left-width")),
            y: $elem.position().top + parseInt($elem.css("padding-top")) + parseInt($elem.css("border-top-width")),
            w: $elem.width(),
            h: $elem.height()
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
    var drawImage = function(pointProps, endPoint, midPoint, anchorPoint, color, callback) {
        var image = new Image();
        var context = this;

        var points = {
            anchor: {},
            mid: {},
            end: {}
        };

        var vertical = (anchorPoint.x === midPoint.x && anchorPoint.y !== midPoint.y);

        var endProps = $.extend(true, {}, this.options.endPoint, pointProps.endPoint);
        var anchorProps = $.extend(true, {}, this.options.anchorPoint, pointProps.anchorPoint);
        var lineProps = $.extend(true, {}, this.options.line, pointProps.line);

        var dims = {
            w: Math.ceil(Math.abs(anchorPoint.x - endPoint.x) + endProps.radius + anchorProps.radius + 6),
            h: Math.ceil(Math.abs(endPoint.y - anchorPoint.y) + endProps.radius + anchorProps.radius + 6)
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
        if (Math.abs(anchorPoint.y - endPoint.y) <= endProps.radius) {
            vOffset = (this.options.endPoint.radius + 2) - Math.abs(anchorPoint.y - endPoint.y);
            if (vOffset < 0) {
                vOffset = 0;
            }
        }
        //Pointer coming from right or left?
        if (endPoint.x > anchorPoint.x) {
            points.anchor.x = 1 + anchorProps.radius;
            points.mid.x = Math.ceil(midPoint.x - anchorPoint.x) + points.anchor.x;
            points.end.x = Math.ceil(endPoint.x - anchorPoint.x) + points.anchor.x;
        } else {
            points.anchor.x = Math.ceil(dims.w - 1 - anchorProps.radius);
            points.mid.x = points.anchor.x - Math.ceil(anchorPoint.x - midPoint.x);
            points.end.x = points.anchor.x - Math.ceil(anchorPoint.x - endPoint.x);
        }
        //Pointer coming from top or bottom?
        if (endPoint.y > anchorPoint.y) {
            points.anchor.y = 1 + anchorProps.radius;
            points.mid.y = Math.ceil(midPoint.y - anchorPoint.y) + points.anchor.y;
            points.end.y = Math.ceil(endPoint.y - anchorPoint.y) + points.anchor.y;
        } else if (anchorPoint.y > endPoint.y) {
            points.anchor.y = Math.ceil(dims.h - vOffset - 1 - anchorProps.radius);
            points.mid.y = points.anchor.y - Math.ceil((anchorPoint.y - midPoint.y) - vOffset);
            points.end.y = points.anchor.y - Math.ceil((anchorPoint.y - endPoint.y) - vOffset);
        }
        if (lineProps.style === "angled") {
            drawLine(drawing, [points.anchor, points.mid, points.end], lineProps.width, lineProps.color);
        } else if (lineProps.style === "straight") {
            drawLine(drawing, [points.anchor, points.end], lineProps.width, lineProps.color);
        } else if (lineProps.style === "curved") {
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
                drawCurve(drawing, [points.anchor, shortA, shortB, points.end], lineProps.width, lineProps.color, vertical);
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
                drawCurve(drawing, [points.anchor, shortA, shortB, points.end], lineProps.width, lineProps.color, vertical);
            } else {
                drawCurve(drawing, [points.anchor, points.mid, points.end], lineProps.width, lineProps.color, vertical);
            }
        }

        drawAnchorPoint.call(context, drawing, points.anchor, anchorProps, function() {
            drawEndPoint.call(context, drawing, points.end, endProps, function() {
                image.src = canvas.toDataURL("image/png");
                callback(image);
            });
        });
    };

    var drawAnchorPoint = function(drawing, point, anchor, callback) {
        if (anchor.style === "circle") {
            drawCircle(drawing, point, anchor.radius, anchor.stroke, anchor.fillColor, anchor.strokeColor);
        } else if (anchor.style === "square") {
            drawSquare(drawing, point, anchor.radius, anchor.stroke, anchor.fillColor, anchor.strokeColor);
        }
        //If the point is an image then wait for it to complete, otherwise call the callback
        if (anchor.style === "image" && anchor.url !== "") {
            drawImageEndpoint(drawing, point, anchor.url, anchor.radius, callback);
        } else {
            callback.call(this);
        }
    };

    var drawEndPoint = function(drawing, point, end, callback) {
        if (end.style === "circle") {
            drawCircle(drawing, point, end.radius, end.stroke, end.fillColor, end.strokeColor);
        } else if (end.style === "square") {
            drawSquare(drawing, point, end.radius, end.stroke, end.fillColor, end.strokeColor);
        }
        //If the point is an image then wait for it to complete, otherwise call the callback
        if (end.style === "image" && end.url !== "") {
            drawImageEndpoint(drawing, point, end.url, end.radius, callback);
        } else {
            callback.call(this);
        }
    };

    var testImage = function(img) {
        var valid = false;
        var canvas = document.createElement("canvas");
        var drawing = canvas.getContext("2d");
        drawing.drawImage(img, 1, 1);
        try {
            var encoded = canvas.toDataURL();
            valid = true;
        } catch (ex) {
            console.log("The image specified for the endpoint is not a valid image for cross origin resource sharing");
        }
        return valid;
    };

    var drawImageEndpoint = function(canvas, position, url, size, callback) {
        var img = document.createElement("img");
        img.src = url;
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            if (testImage(img)) {
                canvas.drawImage(img, position.x, position.y, size, size);
            }
            callback();
        };
        img.onerror = function() {
            console.log("Couldn't load the endpoint image. Please make sure it's hosted on your sire, is a valid cross origin image, is not located in a file path, and is accessible.");
            callback();
        };
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

    var drawSquare = function(canvas, position, radius, strokeWidth, bgColor, strokeColor) {
        canvas.beginPath();
        canvas.strokeStyle = strokeColor;
        canvas.fillStyle = bgColor;
        canvas.lineWidth = strokeWidth;
        if (strokeWidth > 0) {
            canvas.rect(position.x - radius, position.y - radius, radius * 2, radius * 2);
            canvas.stroke();
        }
        canvas.fillRect(position.x - radius, position.y - radius, radius * 2, radius * 2);
    };

    VideoPointer.prototype.getOptions = function(options) {
        var opts = $.extend(true, {}, this.getDefaults(), this.$element.data(), options);
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