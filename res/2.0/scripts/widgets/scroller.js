/** =======================================================================
 *  Vincent Hardy
 *  License terms: see svg-wow.org
 *  CC0 http://creativecommons.org/publicdomain/zero/1.0/
 *  ======================================================================= */
sw.widgets = sw.widgets || {};

yui = YAHOO;

/**
 * A <code>Scroller</code> scrolls content at the desired 'speed' along the 
 * x and/or y axis. It dampers it's speeds when getting closer to the edges
 * of the scroll area.
 *
 * @param p_container the element into which the scroller will create its
 *        content. Can be a <code>String</code> or an <code>Element</code>.
 *
 * @param p_content element to scroll in the container. Can be either a
 *       <code>String</code> or an <code>Element</code>
 * 
 * @param p_scrollBounds the limits of the scroll area.
 * 
 * @param p_oConfig Optional. The configuration parameters for the scroller:
 *        {
 *          damper: {
 *              x: Number in the [0, 1] range
 *              y: Number in the [0, 1] range
 *          },
 *          sensor: Object with an onIntensityUpdate event.
 *          scrollUnit: {
 *              x: Number,
 *              y: Number
 *          },
 *          disableScroll: {
 *              x: Boolean,
 *              y: Boolean
 *          },
 *          initialScroll: {
 *              x: Number (in the [0, 1] range)
 *              y: Number (in the [0, 1] range)
 *          },
 *          maxAccelleration: {
 *              x: Number (in the [0, 1] range)
 *              y: Number (in the [0, 1] range)
 *        }
 */
sw.widgets.Scroller = function (p_container, p_content,
                                p_scrollBounds, p_oConfig) {
    this.initialize(p_container, p_content, p_scrollBounds, p_oConfig);
};

sw.widgets.Scroller.prototype = {
    /*
     * @see constructor documentation
     */
    initialize : function (p_container, p_content, p_scrollBounds, p_oConfig) {
        /**
         * The parent container.
         */
        var container;

        /**
         * The scrolled content
         */
        var content;

        /**
         * The bounds of the scrolling area.
         */
        var scrollBounds;


        /**
         * The id for the scroller's setInterval. Undefined when not running
         */
        var scrollingRunningId = undefined;

        /**
         * The currently set scrolling speed along each axis.
         */
        var scrollSpeed = {
            x: 0,
            y: 0
        };
        
        /**
         * The actual scroll speed along each axis. May be different from the 
         * requested scroll speed, for example when reaching the end of the 
         * scroll area or while dampering the speed.
         */
        var actualScrollSpeed = {
            x: 0,
            y: 0
        };

        /**
         * The last computed scroll speed.
         */
        var previousScrollSpeed = {
            x: 0,
            y: 0
        };


        /**
         * The scroller's configuration defaults
         */
        var config = {
            /**
             * The scroller's damper
             *
             */
            damper: {
                x: 0.1,
                y: 0.1
            },

            /**
             * The amount of scroll, at full speed, along each axis, for
             * each frame.
             */
            scrollUnit: {
                x: 40,
                y: 40
            },

            /**
             * Optional. If specified, listen to this speed controller to
             * set the scrolling speed.
             */
            sensor: undefined,

            /**
             * Controls if scroll is disabled along one or both of the axis
             *
             */
            disableScroll: {
                x: false,
                y: false
            },

            /**
             * Initial scroll position.
             */
            initialScroll: {
                x: 0.5,
                y: 0.5
            },

            /**
             * Maximum acceleration
             */
            maxAcceleration: {
                x: 0.01,
                y: 0.01
            }
        };

        /**
         * Current scrolling amount. We keep the currentScroll normalized to
         * the [0, 1] range, where 0 is the minimal scroll and 1 the maximum.
         */
        var curScroll = {
            x: 0,
            y: 0
        };

        /**
         * Current acceleration. May be undefined
         */
        var acceleration = {
            x: undefined,
            y: undefined,
            targetSpeed: {
                x: 0,
                y: 0
            }
        };

        /**
         * Compute the conent bounds now. They can be updated with an
         * updateContentBounds call. The content bounds are not recomputed
         * on each scroll to avoid counter effects, for example when
         * magnifying the center of the content on scroll, which changes the
         * content bounds and sets off the scrolling algorithm.
         */
        var contentBox;

        // =====================================================================

        // Apply config parameters
        if (p_oConfig !== undefined && p_oConfig !== null) {
            if (typeof p_oConfig.damper === "object") {
                if (typeof p_oConfig.damper.x === "number") {
                    config.damper.x = p_oConfig.damper.x;
                }
                if (typeof p_oConfig.damper.y === "number") {
                    config.damper.y = p_oConfig.damper.y;
                }
            }
            if (typeof p_oConfig.sensor === "object" &&
                typeof p_oConfig.sensor.events === "object" &&
                p_oConfig.sensor.events.onIntensityUpdate !== undefined) {
                config.sensor = p_oConfig.sensor;
            }
            if (typeof p_oConfig.scrollUnit === "object") {
                if (typeof p_oConfig.scrollUnit.x === "number") {
                    config.scrollUnit.x = p_oConfig.scrollUnit.x;
                }
                if (typeof p_oConfig.scrollUnit.y === "number") {
                    config.scrollUnit.y = p_oConfig.scrollUnit.y;
                }
            }
            if (typeof p_oConfig.disableScroll === "object") {
                if (typeof p_oConfig.disableScroll.x === "boolean") {
                    config.disableScroll.x = p_oConfig.disableScroll.x;
                }
                if (typeof p_oConfig.disableScroll.y === "boolean") {
                    config.disableScroll.y = p_oConfig.disableScroll.y;
                }
            }
            if (typeof p_oConfig.initialScroll === "object") {
                if (typeof p_oConfig.initialScroll.x === "number") {
                    config.initialScroll.x = p_oConfig.initialScroll.x;
                }
                if (typeof p_oConfig.initialScroll.y === "number") {
                    config.initialScroll.y = p_oConfig.initialScroll.y;
                }
            }
            if (typeof p_oConfig.maxAcceleration === "object") {
                if (typeof p_oConfig.maxAcceleration.x === "number") {
                    config.maxAcceleration.x = p_oConfig.maxAcceleration.x;
                }
                if (typeof p_oConfig.maxAcceleration.y === "number") {
                    config.maxAccelleration.y = p_oConfig.maxAcceleration.y;
                }
            }
        }

        // If the speed controller is defined, listen to its update.
        if (config.sensor !== undefined) {
            config.sensor.events.onIntensityUpdate.subscribe(
                function (type, args) {
                    // Invert the sensor's intensity. If to the right
                    // of the sensor's center, move left (i.e., negative speed).
                    // Likewise on the y-azis.
                    var xSpeed = -args[0].x;
                    var ySpeed = -args[0].y;
                    updateScrollSpeed(xSpeed, ySpeed);
                }
            );
            config.sensor.events.onLeave.subscribe(
                function () {
                    setAcceleration(config.maxAcceleration.x,
                                    config.maxAcceleration.y,
                                    {x: 0, y: 0});
                }
            );
        }

        // Convert from id to element if need be
        container = sw.stringToElement(p_container);
        content = new sw.utils.EZTransform(p_content);
        scrollBounds = sw.stringToElement(p_scrollBounds);
        container.appendChild(content.element);

        // Make the container group as this widget's 'element'. 
        this.element = content.element;

        // Initialize events.
        var events = {
            onScrollUpdate : new YAHOO.util.CustomEvent(this.SCROLL_UPDATE)
        };
        this.events = events;
        
        // Set the initial scroll
        curScroll.x = config.initialScroll.x;
        curScroll.y = config.initialScroll.y;

        updateContentBox();
        updateScroll();

        /**
         * Starts or stop scrolling, depending on whether or not there is
         * a non-zero speed.
         */
        function checkScrollState () {
            var running = (actualScrollSpeed.x != 0 ||
                            actualScrollSpeed.y != 0);
            if (running === true) {
                if (scrollingRunningId === undefined) {
                    scrollingRunningId =
                    setInterval(updateScroll, 40);
                }
            } else {
                if (scrollingRunningId !== undefined) {
                    clearInterval(scrollingRunningId);
                    scrollingRunningId = undefined;
                }
            }
        }

        /**
         * Updates the scrolling speed along the x and y axis.
         *
         * @param p_xSpeed the speed along the x-axis
         * @param p_ySpeed the speed along the y-axis
         */
        function updateScrollSpeed(p_xSpeed, p_ySpeed) {
            if (config.disableScroll.x === false) {
                scrollSpeed.x = p_xSpeed;
            }

            if (config.disableScroll.y === false) {
                scrollSpeed.y = p_ySpeed;
            }

            actualScrollSpeed.x = scrollSpeed.x;
            actualScrollSpeed.y = scrollSpeed.y;

            // Stop accelerations if any.
            acceleration.x = undefined;
            acceleration.y = undefined;

            computeActualSpeed();
            checkScrollState();
        }

        /**
         * Sets the acceleration along each axis.
         *
         * @param p_xAccel the acceleration along the x-axis
         * @param p_yAccel the acceleration along the y-axis
         * @param p_targetSpeed the target speed
         */
        function setAcceleration (p_xAccel, p_yAccel, p_targetSpeed) {
            acceleration = {
                x: p_xAccel,
                y: p_yAccel,
                targetSpeed: {
                    x: p_targetSpeed.x,
                    y: p_targetSpeed.y
                }
            };

            computeActualSpeed();
            checkScrollState();
        }

        /**
         * Computes the actual speed, accounting for constraints and dampering,
         * for example.
         */
        function computeActualSpeed () {
            computeActualAxisSpeed("x");
            computeActualAxisSpeed("y");
        }

        /**
         * Implementation helper. The scroll happens in the
         *
         * [-contentBox.width + scrollBox.width / 2, scrollBox.width / 2] and
         * [-contentBox.height + scrollBox.height / 2, scrollBox.height / 2]
         *
         * ranges on each axis.
         */
        function computeActualAxisSpeed (xOrY) {
            var scrollLeft;
            var damper = 1;

            // Check if we have reached the end of the scrolling area
            // or if we are in the damper zone
            if (scrollSpeed[xOrY] < 0) {
                // Moving back to zero
                scrollLeft = curScroll[xOrY];
            } else {
                scrollLeft = 1 - curScroll[xOrY];
            }

            if (scrollLeft < config.damper[xOrY]) {
                damper = scrollLeft / config.damper[xOrY];
            }

            // If there is an acceleration, apply it now if need be
            if (acceleration[xOrY] !== undefined &&
                    config.disableScroll[xOrY] === false) {
                // There is an acceleration defined.
                // We need to move the actual speed towards the target speed.
                if (previousScrollSpeed[xOrY] > acceleration.targetSpeed[xOrY]){
                    actualScrollSpeed[xOrY] = previousScrollSpeed[xOrY] -
                                                acceleration[xOrY];

                    if (actualScrollSpeed[xOrY] <
                                            acceleration.targetSpeed[xOrY]) {
                        actualScrollSpeed[xOrY] =
                                            acceleration.targetSpeed[xOrY];
                    }
                } else {
                    actualScrollSpeed[xOrY] = previousScrollSpeed[xOrY] +
                                                acceleration[xOrY];
                    if (actualScrollSpeed[xOrY] >
                                            acceleration.targetSpeed[xOrY]) {
                        actualScrollSpeed[xOrY]=
                                            acceleration.targetSpeed[xOrY];
                    }
                }

                // If we have reached the target speed, stop the acceleration
                if (actualScrollSpeed[xOrY] ===  acceleration.targetSpeed[xOrY]) {
                    acceleration[xOrY] = undefined;
                    scrollSpeed[xOrY] = acceleration.targetSpeed[xOrY];
                }

                actualScrollSpeed[xOrY] *= damper;

            } else {
                actualScrollSpeed[xOrY] =
                        scrollSpeed[xOrY] * damper;
            }
        }

        /**
         * Take the current content bounding box into account for scrolling
         * computation purposes.
         * @see the contentBox variable documentation for a discussion on why
         *      the contentBox is not dynamically taken into account.
         */
        function updateContentBox () {
            contentBox = content.element.getBBox();
            this.contentBox = contentBox;
            updateScroll();
        }
        this.updateContentBox = updateContentBox;
        
        /**
         * Handles scrolling. This is where the content is actually positioned.
         */
        function updateScroll () {
            if (contentBox !== null && contentBox.width > 0 &&
                        contentBox.height > 0) {
                var scrollBy = {
                    x: 0,
                    y: 0
                };
                var scrollBox = scrollBounds.getBBox();
                var scrollRange = {
                    x: contentBox.width,
                    y: contentBox.height
                };

                var minScroll = {
                    x: -contentBox.width + scrollBox.width / 2,
                    y: -contentBox.height + scrollBox.height / 2

                };

                var maxScroll = {
                    x: scrollBox.width / 2,
                    y: scrollBox.height / 2
                };

                var sx, sy;

                // Account for dampering or other effects.
                computeActualSpeed();

                previousScrollSpeed.x = actualScrollSpeed.x;
                previousScrollSpeed.y = actualScrollSpeed.y;

                scrollBy.x = actualScrollSpeed.x * config.scrollUnit.x;
                scrollBy.y = actualScrollSpeed.y * config.scrollUnit.y;

                curScroll.x += scrollBy.x / scrollRange.x;
                curScroll.y += scrollBy.y / scrollRange.y;

                // Clip to allowed range
                if (curScroll.x > 1) {
                    curScroll.x = 1;
                } else if (curScroll.x < 0) {
                    curScroll.x = 0;
                }

                if (curScroll.y > 1) {
                    curScroll.y = 1;
                } else if (curScroll.y < 0) {
                    curScroll.y = 0;
                }

                // Move the content to the origin, then to the scrollBox's
                // origin and and then apply the scroll'
                sx = -contentBox.x + scrollBox.x +
                       curScroll.x * maxScroll.x + (1 - curScroll.x) * minScroll.x;
                sy = -contentBox.y + scrollBox.y +
                       curScroll.y * maxScroll.y + (1 - curScroll.y) * minScroll.y;
                content.moveTo(sx, sy);

                events.onScrollUpdate.fire({x: curScroll.x, y: curScroll.y});

                // In case we have reached zero speed, stop the setInterval.
                checkScrollState();
           }
        }

       // Make updateScroll public.
       this.updateScroll = updateScroll;
    },

    // Constants
    SCROLL_UPDATE: "SCROLL_UPDATE"
};