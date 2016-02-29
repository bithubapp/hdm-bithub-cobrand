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
import "can/control/plugin/";

let feedURL = function(hub, decision, tenant) {
	return `http://bithub.com/api/v4/embeds/${hub}/entities?decision=${decision}&tenant_name=${tenant}&image_only=true&offset=0&limit=50`;
};

can.Component.extend({
	tag: "hdm-cobrand",
	template: initView,
	viewModel: {
		currentBitIdx: null,
		resetCycle: 0,
		// unprocessed request data, processed in sync with bit cycling
		unprocessedData: null,
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
			} else if (length < 1) {
				this.viewModel.attr("cycling", false);
				clearTimeout(this.__cycleTimeout);
			}
		},
		cycle: function() {
			let self = this;
			this.__cycleTimeout = setTimeout(function() {
				if(!self.element) {
					return;
				}

				// if a new dataset is pending processing do it before we start a transition
				if (self.viewModel.unprocessedData !== null) {
					self.processData(self.viewModel.unprocessedData);
					self.viewModel.attr('unprocessedData', null);
				}

				// start transition
				self.element.find('.current-bit').addClass('exiting');
				self.element.find('.next-bit').addClass('entering');

				// complete transition, queue next
				setTimeout(function() {
					let currentBitIdx = self.viewModel.attr('currentBitIdx');
					let length = self.viewModel.attr('currentBits.length');
					let nextIdx = currentBitIdx + 1;
					if(nextIdx >= length) {
						nextIdx = 0;
					}
					self.viewModel.attr('currentBitIdx', nextIdx);
					self.cycle();
				}, 510);
			}, 5000);
		},
		// update bits & active index
		processData: function(data) {
			let bits = this.viewModel.attr('currentBits');
			let spliceArgs = [0, bits.length];
			let newIdx = null;
			let curIdx = this.viewModel.attr('currentBitIdx');

			// filter starred, find matching bit
			for(var i = 0; i < data.length; i++) {
				let bit = data[i];
				if (bit.decision !== "starred") {
					spliceArgs.push(bit);

					// maintain active bit between reloads
					if (curIdx && bit.id === bits[curIdx].id) {
						newIdx = spliceArgs.length - 3;
					}
				}
			}

			// initialize currentBitIdx
			if (curIdx === null) {
				newIdx = 0;
			}

			// have bits in new set
			if(spliceArgs.length > 2) {
				// matching bit not found. current bit now exists as last bit of new set
				if (newIdx === null) {
					spliceArgs.push(bits[this.viewModel.attr('currentBitIdx')]);
					newIdx = spliceArgs.length - 3;
				}

				// replace old set with new set, maintaining position if possible
				can.batch.start();
				if (newIdx !== null) {
					this.viewModel.attr('currentBitIdx', newIdx);
				}

				bits.splice.apply(bits, spliceArgs);
				can.batch.stop();
			}
		},
		loadNewBits: function() {
			let self = this;
			let doInit = true;
			let _loadBits = function() {
				clearTimeout(self.__loadNewBitsTimeout);
				self.viewModel.attr("ApprovedModel").findAll().then(function(data) {
					// handle processing for first call, after let .cycle do processing
					if (doInit) {
						self.processData(data);
						doInit = false;
					} else {
						self.viewModel.attr('unprocessedData', data);
					}
				});
				self.__loadNewBitsTimeout = setTimeout(_loadBits, 30000);
			};
			_loadBits();
		}
	}
});
