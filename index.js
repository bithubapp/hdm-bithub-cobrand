import $ from "jquery";
import can from "can";
import stache from "can/view/stache/";
import initView from "./index.stache!";
import "can/map/define/";
import "can/list/promise/";
import "./style.less!";
import "sponsors/";

const URL = 'http://bithub.com/api/v3/embeds/143/entities?view=public&tenant_name=calm_dove_6826&image_only=true&offset=0&limit=5';

var Bit = can.Model.extend({
	findAll: URL
}, {});

var Hub = can.Component.extend({
	tag: 'hg-hub',
	template: initView,
	scope : {
		currentBitIdx: 0,
		define : {
			bits : {
				get : function(){
					return new Bit.List({});
				}
			}
		},
		currentBit : function(){
			if(this.attr('bits').isResolved()){
				return this.attr('bits.' + this.attr('currentBitIdx'));
			}
		},
		nextBit : function(){
			if(this.attr('bits').isResolved()){
				var nextBitIdx = this.attr('currentBitIdx') + 1;
				if(nextBitIdx === this.attr('bits').attr('length')){
					nextBitIdx = 0;
				}
				return this.attr('bits.' + nextBitIdx);
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
				if(!self.element){
					return;
				}
				self.element.find('.current-bit').addClass('current-bit-exiting');
				self.element.find('.next-bit').addClass('next-bit-entering');
				setTimeout(function(){
					var currentBitIdx = self.scope.attr('currentBitIdx');
					var length = self.scope.attr('bits.length');
					var nextIdx = currentBitIdx + 1;
					if(nextIdx >= length){
						nextIdx = 0;
					}
					self.scope.attr('currentBitIdx', nextIdx);
					self.cycle();	
				}, 600);				
			}, 5000);
		}
	}
});

var template = stache("<hg-hub></hg-hub>");

$('#app').html(template());
