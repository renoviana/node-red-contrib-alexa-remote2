# node-red-contrib-alexa-remote2 (maintained fork)

[![npm](https://img.shields.io/npm/v/@renoviana/node-red-contrib-alexa-remote2.svg)](https://www.npmjs.com/package/@renoviana/node-red-contrib-alexa-remote2) [![downloads](https://img.shields.io/npm/dt/@renoviana/node-red-contrib-alexa-remote2.svg)](https://www.npmjs.com/package/@renoviana/node-red-contrib-alexa-remote2)

This is a collection of Node-RED nodes for interacting with the Alexa API.
You can emulate routine behaviour, control and query your devices and much more!

All functionality is from [alexa-remote2](https://www.npmjs.com/package/alexa-remote2).
The goal is to expose all of [alexa-remote2](https://www.npmjs.com/package/alexa-remote2)s functionality in node-red nodes.

> Maintained fork of [586837r/node-red-contrib-alexa-remote2](https://github.com/586837r/node-red-contrib-alexa-remote2), which is no longer updated.
> It works with the current Amazon login. Your flows keep working: node types and settings are the same.

### **Install**
- **Node-RED palette / npm:** `npm install @renoviana/node-red-contrib-alexa-remote2` in your Node-RED user directory
- **Home Assistant Node-RED add-on:** add the package to `npm_packages` in the add-on configuration and restart it:
  ```yaml
  npm_packages:
    - "@renoviana/node-red-contrib-alexa-remote2"
  ```
- Remove the original `node-red-contrib-alexa-remote2` first, both register the same nodes.

 - [Changelog](CHANGELOG.md)
 - [Examples](examples.md)

### **Setup**
1. Drag an **Alexa Routine** node into your flow.
2. Create a new Account by pressing the edit button at the right side of the *Account* field.
3. Choose a **Service Host** and **Page** and **Language** depending on your location. For example:

   |     | Service Host        | Page          | Language |
   |-----|---------------------|---------------|----------|
   | USA | pitangui.amazon.com | amazon.com    | en-US    |
   | UK  | alexa.amazon.co.uk  | amazon.co.uk  | en-UK    |
   | GER | layla.amazon.de     | amazon.de     | de-DE    |
   | ITA | alexa.amazon.it     | amazon.it     | it-IT    |
   | AUS | alexa.amazon.com.au | amazon.com.au | en-US    |
   
4. Set **This IP** to the ip your browser uses to reach Node-RED (in Home Assistant: the Home Assistant ip, not `localhost`)
5. Optionally enter a **File Path** for the authentication result. When empty it is saved in the Node-RED user directory, so restarts do not need a new login.
6. *Add* the new Account.
7. Deploy
8. Follow the url you see in the node status (also shown, clickable, at the top of the account dialog)
9. Log in, wait until you see the node status **ready**
10. Write "Hello World!" in the *Alexa Routine* node text field.
11. Select a device in the *Alexa Routine* node devices field.

Now trigger the *Alexa Routine* Node with any message and your Alexa will say "Hello World!". (Hopefully!)

### **Language / Idioma**
- Node status, warnings and errors follow the account option **Messages** (*Automatic*, *English*, *Português (Brasil)*). *Automatic* uses the Node-RED `lang` setting or the `LANG` variable; in the Home Assistant add-on pick the language directly.
- The *Account*, *Event* and *Init* dialogs and help follow the Node-RED editor language (User settings → View → Language).

### **Staying logged in**
- The account refreshes its authentication every *Refresh* days (1-14, default 3) without a new login.
- A new login is only needed if you change your Amazon password, remove the registered device in your Amazon account, or Amazon revokes it.
- Add an **Alexa Event** node with **Login Required** and connect it to a notification: `msg.payload.loginUrl` is the link to open.
- To test the refresh now, send a message to an **Alexa Init** node with **Refresh Cookie**.

### **Development**
- `npm test` runs the unit tests (Node.js 18+).

### **Guides**
These are few community guides that can help you install the plugin/module. If you find more let us know.

- [Alexa Text-To-Speech - How-To (2020)](https://youtu.be/vj9K0O_3zxI)
- [Alexa TTS using Node-RED – How-To (2020)](https://peyanski.com/alexa-tts-how-to/)
- [Node Red Alexa Remote2](https://tech.scargill.net/node-red-alexa-remote2/)

