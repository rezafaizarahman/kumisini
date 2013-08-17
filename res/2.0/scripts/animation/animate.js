/** =======================================================================
 *  Vincent Hardy
 *  License terms: see svg-wow.org
 *  CC0 http://creativecommons.org/publicdomain/zero/1.0/
 *  ======================================================================= */

(function () {

sw.animation = sw.animation || {};

yui = YAHOO;

var Anim = yui.util.Anim;

/**
 * Object with the names of the transform pseudo attributes.
 */
var PSEUDO_ATTRIBUTES = {
    tx: "#tx",
    ty: "#ty",
    sx: "#sx",
    sy: "#sy",
    r: "#r"
};

var PSEUDO_DEFAULTS = {
    tx: 0,
    ty: 0,
    sx: 1,
    sy: 1,
    r: 0
};

var PSEUDO_ATTRIBUTES_ARRAY = ["tx", "ty", "sx", "sy", "r"];
var N_PSEUDO_ATTRIBUTES = PSEUDO_ATTRIBUTES_ARRAY.length;

/**
 * Simple extension of the YUI animation classes to handle SVG transforms.
 *
 * The extension handles the "r", "sx", "sy", "tx" and "ty" pseudo attributes
 * by manipulating the transform of the target element using a template.
 *
 * @param p_el the element that will be animated
 * @param p_attributes the attributes to animate. This animation class adds the
 *        "r" (rotation), "tx", "ty", "sx" and "sy" (scale) pseudo-attributes.
 * @param p_oTransformTemplate the template for the transform attribute to
 *        animate. By default, it is
 *        "translate(#tx,#ty) scale(#sx,#sy) rotate(#r)"
 *        but it can be set to any string.
 * @param p_oDuration the animation duration
 * @param p_oMethod easing method
 *
 * @see http://developer.yahoo.com/yui/docs/YAHOO.util.Anim.html
 */
sw.animation.Animate = function (p_el, p_attributes,
                                 p_oDuration,
                                 p_oMethod) {
    sw.animation.Animate.superclass.constructor.call(this, p_el,
            p_attributes, p_oDuration, p_oMethod);

    var el = sw.stringToElement(p_el);

    var _endCallbacks = [];
    var _endAnimations = [];
    var _beginCallbacks = [];
    var _beginAnimations = [];

    this._endCallbacks = _endCallbacks;
    this._endAnimations = _endAnimations;
    this._beginCallbacks = _beginCallbacks;
    this._beginAnimations = _beginAnimations;

    this.onComplete.subscribe(function () {
        for (var i = 0; i < _endCallbacks.length; i++) {
            _endCallbacks[i]();
        }

        for (i = 0; i < _endAnimations.length; i++) {
            _endAnimations[i].animate();
        }
    });

    this.onStart.subscribe(function () {
        for (var i = 0; i < _beginCallbacks.length; i++) {
            _beginCallbacks[i]();
        }

        for (i = 0; i < _beginAnimations.length; i++) {
            _beginAnimations[i].animate();
        }
    });
};


yui.lang.extend(sw.animation.Animate,
                Anim, {



    /**
     * Sets the new attribute value
     *
     * @param p_attr the attribute name
     * @param p_val the attribute value
     * @param p_unit the unit
     */
    setAttribute : function (p_attr, p_val, p_unit) {
        var el = this.getEl();
        if (attributeHandlers[p_attr] &&
            attributeHandlers[p_attr].setAttribute) {
            return attributeHandlers[p_attr].setAttribute.call(this, el, p_val);
        } else {
            // Let the base class handle the attributes
            sw.animation.Animate.superclass.setAttribute.call(this,
                    p_attr, p_val, p_unit);
        }
    },

    /**
     * Gets the attribute value
     *
     * @param p_attr the attribute name
     */
    getAttribute : function (p_attr) {
        if (attributeHandlers[p_attr] &&
            attributeHandlers[p_attr].getAttribute) {
            return attributeHandlers[p_attr].getAttribute.call(this, this.getEl());
        } else {
            // Let the base class handle the attribute
            return sw.animation.Animate.superclass.
                getAttribute.call(this, p_attr);
        }
    },

    /**
     * Overrides the default implementation to check if there is an attribute
     * handler for the attribute.
     * @param {String} attr The name of the attribute.
     * @param {Number} start The value this attribute should start from for this animation.
     * @param {Number} end  The value this attribute should end at for this animation.
     * @return The Value to be applied to the attribute.
     */
    doMethod : function (attr, start, end) {
        var val;

        if (attributeHandlers[attr] &&
            attributeHandlers[attr].interpolate) {
            var p = this.method(this.currentFrame, 0, 100, this.totalFrames) / 100;
            val = attributeHandlers[attr].interpolate.call(this, start, end, p);
        } else {
            val = Anim.prototype.doMethod.call(this, attr, start, end);
        }

        return val;
    },

    /**
     * Implementation helper: applies the current transform.
     * Note that this quite costly, from a computation perspective, so
     * it should be use conservatively.
     */
    applyTransform : function () {
        var txf = this.transformTemplate;
        var el = this.getEl();
        var attrs = PSEUDO_ATTRIBUTES;
        var a = PSEUDO_ATTRIBUTES_ARRAY;
        var n = a.length;
        var p;

        for (var i = 0; i < n; i++) {
            p = a[i];
            txf = txf.replace(attrs[p], el[p]);
        }

        el.setAttribute("transform", txf);
    },

    /**
     * Returns a handler that will start this animation instance when invoked.
     */
    getStartHandler : function () {
        var that = this;
        if (this._startHandler === undefined) {
            this._startHandler = function () {
                that.animate();
            };
        }

        return this._startHandler;
    },

    /**
     * Adds a function of animation to call or play when this animation ends
     *
     * @param p_animOrCallback an animation or function to trigger when this
     *        animation ends
     */
    onEnd : function (p_animOrCallback) {
        if (typeof p_animOrCallback === "function") {
            this._endCallbacks.push(p_animOrCallback);
        } else if (p_animOrCallback !== null &&
                   p_animOrCallback !== undefined &&
                   typeof p_animOrCallback.animate === "function") {
            this._endAnimations.push(p_animOrCallback);
        }
    },

    /**
     * Adds a function of animation to call or play when this animation begins
     *
     * @param p_animOrCallback an animation or function to trigger when this
     *        animation begins
     */
    onBegin : function (p_animOrCallback) {
        if (typeof p_animOrCallback === "function") {
            this._beginCallbacks.push(p_animOrCallback);
        } else if (p_animOrCallback !== null &&
                   p_animOrCallback !== undefined &&
                   typeof p_animOrCallback.animate === "function") {
            this._beginAnimations.push(p_animOrCallback);
        }
    }
});

/**
 * Class static
 */
var attributeHandlers = {};

/**
 * Adds a new way to handle a given attribute. The handler should have the
 * following:
 *
 * - setAttribute. A funtion taking the element and value as parameters.
 * - getAttribute. A function taking the element as parameter and
 *   returning the attribute value.
 * - interpolate. A function taking the start value, end value, current
 *   progress in time interval and interpolation method as a parameter. It
 *   should return the value to apply to the animation target.
 *
 * @param p_attributeName the name of the attribute to which the handler
 *        applies.
 * @param p_attributeHandler an object holding the setAttribute, getAttribute
 *        and interpolate methods
 */
sw.animation.Animate.addAttributeHandler = function (p_attributeName,
                                                     p_attributeHandler) {
    attributeHandlers[p_attributeName] = p_attributeHandler;
};

// =============================================================================
// Generic handler for the SVG transform attribute
// =============================================================================
sw.animation.Animate.addAttributeHandler("txf", {
    setAttribute: function (e, v) {
        var txf = this.attributes.txf.template, val, p;
        if (txf) {
            for (var p in v) {
                if (v.hasOwnProperty(p)) {
                    val = v[p];
                    txf = txf.replace(PSEUDO_ATTRIBUTES[p], val);
                    e[p] = val;
                }
            }

            e.setAttribute("transform", txf);
        }
    },

    getAttribute: function (e) {
        var result = {
            tx: 0,
            ty: 0,
            sx: 1,
            sy: 1,
            r: 0
        };
        for (var i = 0; i < N_PSEUDO_ATTRIBUTES; i++) {
            a = PSEUDO_ATTRIBUTES_ARRAY[i];
            if (e[a] !== undefined) {
                result[a] = e[a];
            } else {
                e[a] = result[a];
            }
        }
        return result;
    },

    interpolate: function (start, end, p) {
        var s, e, a, result = {}, elt;
        for (var i = 0; i < N_PSEUDO_ATTRIBUTES; i++) {
            a = PSEUDO_ATTRIBUTES_ARRAY[i];
            s = start[a];
            e = end[a];

            if (s === undefined) {
                elt = this.getEl();
                if (elt[a] !== undefined) {
                    s = elt[a];
                }
                if (s === undefined) {
                    s = PSEUDO_DEFAULTS[a];
                }

                start[a] = s;
            }

            if (e !== undefined) {
                result[a] = p * e + (1 - p) * s;
            } else {
                result[a] = s;
            } 
        }
        return result;
    }
});

})();
