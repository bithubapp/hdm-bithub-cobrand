import can from "can";
import initView from "./sponsors.stache!";
import "can/list/promise/";
import "./sponsors.less!";

const URL = 'http://bithub.com/api/v3/embeds/143/entities?view=public&tenant_name=calm_dove_6826&image_only=true&offset=0&limit=5';


var SponsorsBit = can.Model.extend({
	findAll : URL
});

export default can.Component.extend({
	tag: 'hg-sponsors',
	template: initView,
	scope : {
		currentBitIdx: 0,
		define : {
			bits : {
				get : function(){
					return new SponsorsBit.List({});
				}
			}
		},
		currentBit : function(){
			if(this.attr('bits').isResolved()){
				return this.attr('bits.' + this.attr('currentBitIdx'));
			}
		}
	},
	events : {
		init : function(){
			this._isCycleStarted = false;
		},
		"{scope.bits} length" : function(){
			if(!this._isCycleStarted){
				this._isCycleStarted = true;
				this.cycle();
			}
		},
		cycle : function(){
			var self = this;
			setTimeout(function(){
				var currentBitIdx = self.scope.attr('currentBitIdx');
				var length = self.scope.attr('bits.length');
				var nextIdx = currentBitIdx + 1;
				if(nextIdx >= length){
					nextIdx = 0;
				}
				self.scope.attr('currentBitIdx', nextIdx);
				self.cycle();
			}, 5000);
		}
	}
});
