const net = require("net"),
    events = require("events"),
    util = require("util");

let headsetClient = function(opts) {
    opts || (opts = {});
    this.port = opts.port || 13854; //EEG default port
    this.host = opts.host || "localhost"; //Listen server

    let enableRawOutput = !!opts.enableRawOutput;
    this.config = {
        enableRawOutput: enableRawOutput,
        format: "Json"
    };
    events.EventEmitter.call(this);
};

util.inherits(headsetClient, events.EventEmitter);
//Connector server, data as specified by TGSP protocol.
headsetClient.prototype.connect = function() {
    let self = this,
        client = this.client = net.connect(this.port, this.host, () => {
            client.write(JSON.stringify(self.config));
        });
    client.on("data", (data) => {
        try {
            let json = JSON.parse(data.toString());
            if (json["rawEeg"]) {
                self.emit("raw_data", json);
            } else
            if (json["blinkStrength"]) {
                self.emit("blink_data", json);
            } else {
                self.emit("data", json);
            }
        } catch (e) {
            self.emit('Parse error', data.toString())
        }
    });
};

const createClient = function (opts) {
    return new headsetClient(opts || {});
}

module.exports = { headsetClient: headsetClient,createClient};