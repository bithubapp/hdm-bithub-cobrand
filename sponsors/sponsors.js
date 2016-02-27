import can from "can";
import initView from "./sponsors.stache!";
import "can/list/promise/";
import "./sponsors.less!";

export default can.Component.extend({
	tag: "bithub-starred",
	template: initView,
	viewModel: {
		currentBitIdx: 0,
		define: {
			starredBits: {
				Value: can.List
			},
			cycling: {
				value: false
			}
		},
		starredBit: function() {
			if(this.attr("starredBits").attr("length")) {
				return this.attr('starredBits.' + this.attr('currentBitIdx'));
			}
		},
		nextStarred: function() {
			if(this.attr("starredBits").attr("length")) {
				let nextBitIdx = this.attr('currentBitIdx') + 1;
				if(nextBitIdx === this.attr('starredBits').attr('length')){
					nextBitIdx = 0;
				}
				return this.attr('starredBits.' + nextBitIdx);
			}
		}
	},
	events : {
		init: function() {
			this.viewModel.attr("StarredModel", can.Model.extend({
				findAll: this.viewModel.attr("starredUrl")
			}, {}));
		},
		"{viewModel} StarredModel": function() {
			this.loadNewBits();
		},
		"{scope.starredBits} length": function() {
			if(!this.viewModel.attr("cycling") && length > 0){
				this.viewModel.attr("cycling", true);
				this.cycle();
			} else {
				this.viewModel.attr("cycling", false);
				clearTimeout(this.__cycleTimeout);
			}
		},
		cycle: function() {
			let self = this;
			setTimeout(function() {
				let currentBitIdx = self.viewModel.attr('currentBitIdx');
				let length = self.viewModel.attr("starredBits.length");
				let nextIdx = currentBitIdx + 1;
				if(nextIdx >= length) {
					nextIdx = 0;
				}
				self.viewModel.attr('currentBitIdx', nextIdx);
				self.cycle();
			}, 5000);
		},
		loadNewBits: function() {
			let self = this;
			let _loadBits = function() {
				clearTimeout(self.__loadNewBitsTimeout);
				self.viewModel.attr("StarredModel").findAll().then(function(data) {
					let bits = self.viewModel.attr('starredBits');
					let buffer = [];
					let current;
					for(var i = 0; i < data.length; i++) {
						current = data[i];
						if(bits.indexOf(current) === -1) {
							buffer.unshift(current);
						}
					}
					if(buffer.length){
						can.batch.start();
						buffer.unshift(0);
						buffer.unshift(self.currentBitIdx + 1);
						bits.splice.apply(bits, buffer);
						can.batch.stop();
					}
				});
				self.__loadNewBitsTimeout = setTimeout(_loadBits, 30000);
			};
			_loadBits();
		}
	}
});
