const headsetClient = require("../lib");
const assert = require("assert");

//test library
describe("headsetClient", function() {
    describe("#createClient()", function() {
        it("create a headsetClient instance", function() {
            res.json({ "Equal": assert.equal(headsetClient.createClient().constructor, headsetClient.headSetClient) });
        });
    })
});