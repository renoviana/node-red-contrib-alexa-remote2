const tools = require('../lib/common.js');
const i18n = require('../lib/i18n.js');

module.exports = function (RED) {
	function AlexaRemoteEventNode(input) {
		RED.nodes.createNode(this, input);
		tools.assign(this, ['event'], input);
		tools.assignNode(RED, this, ['account'], input);
		if(!tools.nodeSetup(this, input, true)) return;

		this.onAlexaEvent = (val) => {
			this.status({ fill: "green", shape: "dot", text: i18n.t(this, 'status.eventFired') });
			setTimeout(() => this.status({ fill: "grey", shape: "dot", text: i18n.t(this, 'status.listening') }), 2000);
			this.send({ payload: val });
		};
		this.onStatus = (code) => {
			if(code !== 'READY') return;

			this.status({ fill: "yellow", shape: "dot", text: i18n.t(this, 'status.startListening') });
			setTimeout(() => this.status({ fill: "grey", shape: "dot", text: i18n.t(this, 'status.listening') }), 2000);

			this.account.alexa.removeListener(this.event, this.onAlexaEvent);
			this.account.alexa.addListener(this.event, this.onAlexaEvent);
		};

		// account events come from the account itself and work without the push connection
		if(String(this.event).startsWith('account-')) {
			this.onAccountEvent = (state) => {
				const color = state.code === 'READY' ? 'green' : state.code === 'ERROR' || state.code === 'WAIT_PROXY' ? 'red' : 'yellow';
				this.status({ fill: color, shape: 'dot', text: state.message || state.code });
				this.send({ topic: this.event, payload: state });
			};
			this.account.emitter.removeListener(this.event, this.onAccountEvent);
			this.account.emitter.addListener(this.event, this.onAccountEvent);
			this.status({ fill: 'grey', shape: 'dot', text: i18n.t(this, 'status.listening') });
			this.on('close', function() {
				this.account.emitter.removeListener(this.event, this.onAccountEvent);
			});
			return;
		}

		if(!this.account.useWsMqtt) {
			return this.status({ fill: "red", shape: "dot", text: i18n.t(this, 'status.eventsNotSupported') });
		}
		else {
			this.account.emitter.removeListener('state', this.onStatus);
			this.account.emitter.addListener('state', this.onStatus);
			const {code, message} = this.account.state;
			this.onStatus(code, message);
		}

		this.on('close', function() {
			this.account.emitter.removeListener('status', this.onStatus);
			this.account.alexa.removeListener(this.event, this.onAlexaEvent);
			this.account.emitter.removeListener('state', this.onStatus);
		});
	}
	RED.nodes.registerType("alexa-remote-event", AlexaRemoteEventNode);
};