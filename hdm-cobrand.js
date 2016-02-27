import $ from "jquery";
import _ from "lodash";
import can from "can";
import stache from "can/view/stache/";
import initView from "./index.stache!";
import "can/view/autorender/";
import "can/map/define/";
import "can/list/promise/";
import "./hdm-cobrand.less!";
import "sponsors/";
import moment from 'moment';

let feedURL = function(hub, decision, tenant) {
	return `http://bithub.com/api/v4/embeds/${hub}/entities?decision=${decision}&tenant_name=${tenant}&image_only=true&offset=0&limit=50`;
};

can.Component.extend({
	tag: "hdm-cobrand",
	template: initView,
	viewModel: {
		currentBitIdx: 0,
		resetCycle: 0,
		define: {
			currentBits: {
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
			},
			cycling: {
				value: false
			}
		},
		showHub: function() {
			this.attr("embedMarkup", $("textarea#embed-markup").val());
			this.attr("hashTag", $("input#hash-tag").val());
		},
		approvedBit: function() {
			if(this.attr("currentBits").attr("length")) {
				return this.attr("currentBits." + this.attr("currentBitIdx"));
			}
		},
		nextApproved: function() {
			if(this.attr("currentBits").attr("length")) {
				let nextBitIdx = this.attr('currentBitIdx') + 1;
				if(nextBitIdx === this.attr('currentBits').attr('length')){
					nextBitIdx = 0;
				}
				return this.attr('currentBits.' + nextBitIdx);
			}
		},
		updatedAt: function() {
			return moment(this.approvedBit().attr('updated_at')).format('MMMM D, YYYY');
		}
	},
	events : {
		"{viewModel} ApprovedModel": function() {
			this.loadNewBits();
		},
		"{viewModel.currentBits} length": function(_, __, length) {
			if(!this.viewModel.attr("cycling") && length > 0){
				this.viewModel.attr("cycling", true);
				this.cycle();
			} else {
				this.viewModel.attr("cycling", false);
				clearTimeout(this.__cycleTimeout);
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
				self.element.find('.current-bit').addClass('exiting');
				self.element.find('.next-bit').addClass('entering');
				setTimeout(function() {
					let currentBitIdx = self.viewModel.attr('currentBitIdx');
					let length = self.viewModel.attr('currentBits.length');
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
					let bits = self.viewModel.attr('currentBits');
					let buffer = [];
					let current;
					for(var i = 0; i < data.length; i++) {
						current = data[i];
						if (current.decision !== "starred") {
							if (!_.find(bits, { id: current.id })) {
								buffer.push(current);
							}
						}
					}
					if(buffer.length) {
						can.batch.start();
						buffer.unshift(0);
						buffer.unshift(self.scope.currentBitIdx + 1);
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
