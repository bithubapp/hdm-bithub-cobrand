import $ from "jquery";
import can from "can";
import stache from "can/view/stache/";
import initView from "./index.stache!";
import "can/map/define/";
import "can/list/promise/";
import "./style.less!";
import "sponsors/";
import moment from 'moment';

let feedURL = function(hub, decision, tenant) {
	return `http://bithub.com/api/v4/embeds/${hub}/entities?decision=${decision}&tenant_name=${tenant}&image_only=true&offset=0&limit=50`;
};

can.Component.extend({
	tag: "bithub-approved",
	template: initView,
	viewModel: {
		currentBitIdx: 0,
		resetCycle: 0,
		define: {
			bits: {
				Value: can.List
			},
			hashTag: {
				set: function(raw) {
					return raw.replace(/\#/g, "");
				}
			},
			embedMarkup: {
				set: function(markup) {
					let href = can.buildFragment(markup)
						.querySelector("a[href]")
						.getAttribute("href");

					let {hubId: hub, tenant: tenant} =
						can.deparam(href.split("?")[1]);

					this.attr("approvedURL", feedURL(hub, "approved", tenant));
					this.attr("starredURL", feedURL(hub, "starred", tenant));

					return markup;
				}
			},
			approvedURL: {
				set: function(url) {
					this.attr("ApprovedModel", can.Model.extend({
						findAll: url
					}, { }));
					return url;
				}
			}
		},
		showHub: function() {
			this.attr("embedMarkup", $("textarea#embed-markup").val());
			this.attr("hashTag", $("input#hash-tag").val());
		},
		approvedBit: function() {
			if(this.attr("bits").attr("length")) {
				return this.attr("bits." + this.attr("currentBitIdx"));
			}
		},
		nextBit: function() {
			if(this.attr("bits").attr("length")) {
				let nextBitIdx = this.attr('currentBitIdx') + 1;
				if(nextBitIdx === this.attr('bits').attr('length')){
					nextBitIdx = 0;
				}
				return this.attr('bits.' + nextBitIdx);
			}
		},
		updatedAt: function() {
			return moment(this.approvedBit().attr('updated_at')).format('MMMM D, YYYY');
		}
	},
	events : {
		init: function() {
			this._isCycleStarted = false;
		},
		"{viewModel} ApprovedModel": function() {
			this.loadNewBits();
		},
		"{viewModel.bits} length": function() {
			if(!this._isCycleStarted){
				this._isCycleStarted = true;
				this.cycle();
			}
		},
		"{viewModel} resetCycle": function() {
			clearTimeout(this.__cycleTimeout);
			this.cycle();
		},
		cycle: function() {
			let self = this;
			this.__cycleTimeout = setTimeout(function() {
				if(!self.element) {
					return;
				}
				self.element.find('.current-bit').addClass('current-bit-exiting');
				self.element.find('.next-bit').addClass('next-bit-entering');
				setTimeout(function() {
					let currentBitIdx = self.viewModel.attr('currentBitIdx');
					let length = self.viewModel.attr('bits.length');
					let nextIdx = currentBitIdx + 1;
					if(nextIdx >= length) {
						nextIdx = 0;
					}
					self.viewModel.attr('currentBitIdx', nextIdx);
					self.cycle();
				}, 600);
			}, 5000);
		},
		loadNewBits: function() {
			let self = this;
			let _loadBits = function() {
				clearTimeout(self.__loadNewBitsTimeout);
				self.viewModel.attr("ApprovedModel").findAll().then(function(data) {
					let bits = self.viewModel.attr('bits');
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

let template = stache("<bithub-approved></bithub-approved>")
$('#app').html(template());
