const { app, BrowserWindow, ipcMain } = require('electron');

// Globals we need:

// openAccounts (to send the javascript to)
const openAccounts = new Map();
// accountBalancePattern (to get the command pattern)
let accountBalancePattern = new Map([
    //[acctID, { updateRef, match, currency, quantity, selector, value, offset }]
    ['17', {
        updateRef: "enbridge",
        currency: "CAD",
        offset: "0",
        quantity: "-$1$2",
        selector: ".current-balance .balance",
        value: "innerText",
        match: "\\$(\\d*)?,?(\\d*\\.\\d{2})"
    }]
]);
let pathArray = [{
    updateRef: "enbridge",
    updateSequence: [
        {
            N_PATTERN: {
                match: "\\$(\\d*)?,?(\\d*\\.\\d{2}) "
            }
        },
        {
            command: "goto",
            target: "https://www.enbridgegas.com/myEnbridge/login.aspx"
        },
        {
            command: "set",
            target: ".signin-username",
            value: "shannonjclarke@gmail.com"
        },
        {
            command: "set",
            target: ".signin-password",
            value: "Peterman2"
        },
        {
            command: "click",
            target: ".submit-signin"
        }
    ]
}
]

// redirect ipcSend calls to the console
const ipcSend = (channel, payload) => {
    console.log('channel:', channel);
    console.log('payload:', JSON.stringify(payload, null, 1));
    // mainWindow.webcontents.Send...
}

/** functions to test */

// in retry mode, don't redefine the function just call it
const getBalances = async acctID => {

    const allPatterns = new Map([...accountBalancePattern].filter(([k, v]) => v.updateRef === accountBalancePattern.get(acctID).updateRef));
    // parser is {match, currency, quantity, selector, offset, value}
    console.log(allPatterns.get(`${acctID}`));
    // currency and quantity correspond to matches from the config regexp
    const getBalance = `
        if (typeof getData !== 'function') {
          window.getData = function () {
            const result = [];
            ${[...allPatterns].map(([k, v]) => `result.push(['${k}', document.${v.updateRef === 'sjc' ? `querySelector('frame').contentDocument.body.` : ''}querySelectorAll('${v.selector}')[${v.offset}].${v.value}])`).join(';\n')}
            return result;
          }
        }
        console.warn('pushing commandlist', ${[...allPatterns].map(([k, v]) => `'[${k}, ${JSON.stringify(v)}]'`).join(',')});
        console.warn(window.getData());
        window.getData();`
    try {
        const result = await openAccounts.get(`${acctID}`).webContents.executeJavaScript(getBalance, false);
        const updatedRecord = result.map(([accountID, accountData]) => {
            // first create the dollars, cents, and [currency] regex from the accountPattern map
            const matchVal = new RegExp(allPatterns.get(accountID).match, 'g');
            const { quantity, currency } = allPatterns.get(accountID);
            // replace using the regex (from config.json) and the replace pattern (from accountList.json)
            // to convert into a signed Float (strip off commas and dollar signs)
            console.log(accountID, accountData, matchVal);
            const matchResult = accountData.match(matchVal)[0];
            return {
                acctID: accountID,
                balance: parseFloat(matchResult.replace(matchVal, quantity).replace('(', '-')),
                currency: matchResult.replace(matchVal, currency)
            }
        });
        console.log('Main: received new balance data from account window', updatedRecord);
        return updatedRecord;
    } catch (err) {
        console.error(err);
        return 'error: problem getting balances';
    }
};

const openAccountWindow = (updateRef, acctID, alreadyOpen = false, openWindow = {}) => {

    // takes a file argument and opens a window
    // also stops the title from changing
    const viewerWindow = alreadyOpen ? openWindow : new BrowserWindow({
        width: 1024,
        height: 800,
        x: 50,
        y: 50,
        autoHideMenuBar: true,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: false
        }
    });

    const waitForPage = ms => new Promise(resolve => setTimeout(resolve, ms));

    const doSomethingOnPage = async entry => {

        try {
            const targetWindow = viewerWindow.webContents;
            if (entry.command === 'type') {
                const alreadyTyped = await targetWindow.executeJavaScript(`
            document.querySelector('${entry.target}').focus();
            console.log('activating focus on', document.querySelector('${entry.target}'));
            (()=>document.querySelector('${entry.target}').value!=='')();
        `, false);
                if (!alreadyTyped) entry.value.split('').map(key => targetWindow.sendInputEvent({ type: 'char', keyCode: key }));
                await waitForPage(500);
            }
            if (entry.command === 'set') {
                await targetWindow.executeJavaScript(`
                document.querySelector('${entry.target}').value = '${entry.value}';
                console.log(document.querySelector('${entry.target}').value);`
                );
            }
            if (entry.command === 'click') {
                await targetWindow.executeJavaScript(`document.querySelector('${entry.target}').click();`, false);
                await waitForPage(1000);
            }
            return Promise.resolve(entry.command);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    const runCommands = () => commandSequence.map(command => () => doSomethingOnPage(command)).reduce((promise, func) =>
        promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]))
        .then(result => waitForPage(5000))
        .then(() => {
            console.log('finished loading redirect page, calling page scrape');
            return getBalances(`${acctID}`);
        })
        .then(message => ipcSend(typeof(message) === 'string' ? 'message' : 'new_balance_available', message))
        .catch(console.error.bind(console));

    const entry = pathArray
        .filter(val => val.updateRef === updateRef).reduce(val => val).updateSequence;

    // pull off the commands
    const url = entry.find(elem => elem.command === 'goto').target;
    const commandSequence = entry.filter(elem => elem.command !== 'goto' && !elem.hasOwnProperty('N_PATTERN'));


    // window not open - set up the listeners and load it.
    if (!alreadyOpen) {
        // When the account is closed, delete it from the map of open accounts
        viewerWindow.on('closed', () => {
            console.log(`Main: window closed: ${acctID}`);
            openAccounts.delete(`${acctID}`);
        });

        viewerWindow.webContents.once('did-stop-loading', async e => {
            // every time there's a did-stop-loading event this will fire, many times
            // since there's lots of redirects
            waitForPage(1000);
            console.log(`finished Loading, executing startup commands`);
            runCommands();
        })

        // now open the window
        viewerWindow.loadURL(`${url}`);
        //viewerWindow.loadURL(`file://${__dirname}/accountView.html`)
        //viewerWindow.webContents.send('load_account', url);   
        viewerWindow.webContents.openDevTools();
        openAccounts.set(`${acctID}`, viewerWindow);
    } else {
        // window is already open, user clicked on the button again
        console.log(`retrying startup commands`);
        runCommands();
    }
};

app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('ready', async () => {
    // test code
    let alreadyOpen = false;
    let accountWindow = false;
    // check to see if window already opened - if so just give it the focus
    if (openAccounts.has('17')) {
        accountWindow = openAccounts.get('17');
        accountWindow.focus();
        alreadyOpen = true;
    }
    ipcSend('message', alreadyOpen ? 'retry login and scrape' : 'account opened');
    await openAccountWindow('enbridge', '17', alreadyOpen, accountWindow);
});