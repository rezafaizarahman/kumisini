/** =======================================================================
 *  Vincent Hardy
 *  License terms: see svg-wow.org
 *  CC0 http://creativecommons.org/publicdomain/zero/1.0/
 *  ======================================================================= */
sw.widgets = sw.widgets || {};

yui = YAHOO;

/**
 * An <code>Sensor</code> which computes an intensity along the x and y axis
 * based on the distance between its sensor element and a control point
 * (typically followin the mouse mouvements). The intensity is at 1 in the
 * center and zero on the edges.
 *
 * Example:
 * <code>
 * var sensor = new sw.widgets.Sensor(sensorElt);
 *
 * sensor.events.onIntensityUpdate.subscribe(function (type, args) {
 *      var x = args[0].x;
 *      var y = args[0].y
 * });
 * function onMouseMove (event) {
 *      sensor.setControlPoint({x: event.clientX, y: event.clientY});
 * }
 *
 * </code>
 *
 * @param p_sensor an <code>Element</code> or element id. This element's
 *        bounds define the sensor area.
 * @param p_oIntensityFunctions with x and y functions to interpolate the values
 *        in the [0, 1] range.
 */
sw.widgets.Sensor = function (p_sensor, p_oIntensityFunctions) {
    this.initialize(p_sensor, p_oIntensityFunctions);
};

sw.widgets.Sensor.prototype = {
    /**
     * @param p_sensor an <code>Element</code> or element id. This element's
     *        bounds define the sensor area.
     * @param p_oIntensityFunctions with x and y functions to interpolate the
     *        values in the [0, 1] range.
     */
    initialize : function (p_sensor, p_oIntensityFunctions) {
        var sensor = sw.stringToElement(p_sensor);
        this.element = sensor;
		
        var curIntensity = {
            x: 0,
            y: 0,
            out: {
                x: true,
                y: true
            },
            isOut: true
        };

        var previousIntensity = {
            x: 0,
            y: 0,
            isOut: true
        };


        var speedFunctions = {
            x: function (x) { return x; },
            y: function (y) { return y; }
        };

        if (p_oIntensityFunctions !== undefined &&
                p_oIntensityFunctions !== null) {
            if (typeof p_oIntensityFunctions.x === "function") {
                speedFunctions.x = p_oIntensityFunctions.x;
            }
            if (typeof p_oIntensityFunctions.y === "function") {
                speedFunctions.y = p_oIntensityFunctions.y;
            }
        }

        this.events = {};
        this.events.onIntensityUpdate =
                    new YAHOO.util.CustomEvent(this.INTENSITY_UPDATE);
        this.events.onEnter =
                    new YAHOO.util.CustomEvent(this.ENTER);
        this.events.onLeave =
                    new YAHOO.util.CustomEvent(this.LEAVE);


        /**
         * Computes the intensity along an axis.
         *
         * @param xOrY the axis name
         * @param ref the reference point
         * @param ctrl the control point
         * @param hLength the sensor half length along the axis
         */
        function computeAxisIntensity (xOrY, ref, ctrl, hLength) {
            var i = (ctrl - ref) / hLength;
            if (i > 1) {
                i = 1;
                curIntensity.out[xOrY] = true;
            } else if (i < -1) {
                i = -1;
                curIntensity.out[xOrY] = true;
            } else {
                curIntensity.out[xOrY] = false;
            }

            curIntensity[xOrY] = i;
        }

        /**
         * Computes the current speed. The speed is normalized to the [0, 1]
         * interval.
         *
         * @param p_ctrl the control points to measure distance against the
         *        reference point.
         */
        this.setControlPoint = function (p_ctrl) {
            var ictm = sensor.getScreenCTM().inverse();
            var bounds = sensor.getBBox();


            // ref is in the coordinate systme of the sensor element
            var ref = {
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height /2
            };

            // ctrl is now in the same coordinate system as the sensor element
            var ctrl = ictm.transformPoint(p_ctrl);

            computeAxisIntensity("x", ref.x, ctrl.x, bounds.width / 2);
            computeAxisIntensity("y", ref.y, ctrl.y, bounds.height / 2);
            curIntensity.isOut = curIntensity.out.x || curIntensity.out.y;
            
            curIntensity.x = speedFunctions.x(curIntensity.x, curIntensity.y);
            curIntensity.y = speedFunctions.y(curIntensity.y, curIntensity.x);

            if (curIntensity.isOut) {
                // We are out. Generate a LEAVE event if we were not out
                // before.
                if (!previousIntensity.isOut) {
                    this.events.onLeave.fire();
                } 
            } else {
                if (previousIntensity.isOut) {
                    // We just re-entered the sensor
                    this.events.onEnter.fire();
                }

                this.events.onIntensityUpdate.fire(curIntensity);
            }

            previousIntensity.x = curIntensity.x;
            previousIntensity.y = curIntensity.y;
            previousIntensity.isOut = curIntensity.isOut;

        };
    },

    // Constants
    INTENSITY_UPDATE: "INTENSITY_UPDATE",
    LEAVE: "LEAVE",
    ENTER: "ENTER"
}

