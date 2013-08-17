/** =======================================================================
 *  Vincent Hardy
 *  License terms: see svg-wow.org
 *  CC0 http://creativecommons.org/publicdomain/zero/1.0/
 *  ======================================================================= */

sw.utils = sw.utils || {};

/**
 * An easy transform wrapper provides a simple way to manipulate an object.
 * The <code>rotate</code>, <code>scale</code> methods rotate the object
 * about its anchor point (center by default).
 *
 * @param p_wrapped the element to wrap. A <code>String</code> or an element.
 * @param p_oName optional. Name for the EZTransform container instance.
 */
sw.utils.EZTransform = function (p_wrapped, p_oName) {
    this.initialize(p_wrapped, p_oName);
};

sw.utils.EZTransform.prototype = {
	translateTemplate: "translate(#tx,#ty)",
	scaleTemplate: "scale(#s)",
	rotateTemplate: "rotate(#r)",
	
    initialize : function (p_wrapped, p_oName) {
        /**
         * The wrapped element
         */
        var wrapped = null;

        // Load the wrapper structure.
        this.element = sw.loadContent.call(null, {
            // moveTo group
            tag: "g",
            name: p_oName === undefined? "moveToGroup" : p_oName,
            children: [
                {
                    // scale group
                    tag: "g",
                    name: "scaleGroup",
                    children: [
                        {
                            // rotate group
                            tag: "g",
                            name: "rotateGroup",
                            children: [
                                {
                                    // anchor group
                                    tag: "g",
                                    name: "anchorGroup",
                                    children: [
                                        // element goes here.
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        var moveToGroup = this.element;
        var scaleGroup = moveToGroup.firstChild;
        var rotationGroup = scaleGroup.firstChild;
        var anchorGroup = rotationGroup.firstChild;

        /**
         * Sets the wrapped element.
         *
         * @param p_wrapped
         */
        function setWrapped (p_wrapped) {
            // First, remove the existing content if any
            anchorGroup.removeAllChildren();

            wrapped = null;
            if (p_wrapped !== null) {
                wrapped = sw.stringToElement(p_wrapped);
            }

            if (wrapped !== null) {
                anchorGroup.appendChild(wrapped);
            }
        }
        this.setWrapped = setWrapped;

        setWrapped(p_wrapped);

        
        // Used by moveTo
        this.x = 0;
        this.y = 0;

        /**
         * Moves the anchor to the given location.
         *
         * @param p_x position along the x-axis
         * @param p_y position along the y-axis
         */
        this.moveTo = function (p_x, p_y) {
            if (this.x !== p_x || this.y !== p_y) {
                this.x = p_x;
                this.y = p_y;
                var transform = "translate(".concat(this.x).
					concat(",").concat(this.y).
					concat(")");
                moveToGroup.setAttribute("transform", 
		this.translateTemplate.replace("#tx", this.x).
		replace("#ty", this.y));

            }
        }

        // Used by rotate
        this.rotation = 0;
        /**
         * Rotates this thumbnail by the given angle
         *
         * @param p_rotation rotation angle in degrees
         */
        this.rotate = function (p_rotation) {
            if (p_rotation !== this.rotation) {
                this.rotation = p_rotation;
                rotationGroup.setAttribute("transform", 
                    this.rotateTemplate.replace("#r", this.rotation));
            }
        }

        // Used by scale
        this.scaleFactor = 1;

        /**
         * Scales this thumbnail by the given factor
         *
         * @param p_scaleFactor the amount of scaling
         */
        this.scale = function (p_scaleFactor) {
            if (p_scaleFactor !== this.scaleFactor) {
                this.scaleFactor = p_scaleFactor;
                scaleGroup.setAttribute("transform", 
					this.scaleTemplate.replace("#s", this.scaleFactor));
            }
        }
        
        var curBBox = document.documentElement.createSVGRect();

        /**
         * Anchors the current element using its current bounding box.
         */
        this.anchor = function () {
            var bbox = wrapped.getBBox();

            var tx, ty, transform;
            if (curBBox.x !== bbox.x ||
                curBBox.y !== bbox.y ||
                curBBox.width !== bbox.width ||
                curBBox.height !== bbox.height) {
                // Anchor about center.
                tx = -bbox.x - bbox.width / 2;
                ty = -bbox.y - bbox.height / 2;
                wrapped.setAttribute("transform", 
				    this.translateTemplate.replace("#tx", tx).
					replace("#ty", ty));

                curBBox.x = bbox.x;
                curBBox.y = bbox.y;
                curBBox.width = bbox.width;
                curBBox.height = bbox.height;
            }
        }
    }

}