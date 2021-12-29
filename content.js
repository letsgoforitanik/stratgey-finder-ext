var fieldsInfo = [];
var shadowFields = [];
var popup = null, inputs = null, backTestWrapper = null;
var item = 0;
var cancel = false;


chrome.storage.local.get(['fields'], startTesting);

chrome.runtime.onMessage.addListener(onMessageReceived);


function onMessageReceived(message, sender, sendResponse) {
    
    if (message.hasOwnProperty('cancel')) cancel = true;
}

function addShadowField(info) {
    shadowFields.push({ original: info, value: null });
}

async function reflectChanges() {

    for (let sf of shadowFields) {

        let oldValue = sf.value;
        let newValue = sf.original.current;

        if (oldValue != newValue) {
            sf.value = newValue;
            let input = sf.original.inputField;
            input.value = '';
            input.focus();
            //document.execCommand('insertText', false, newValue.toFixed(2));
            document.execCommand('insertText', false, newValue);
            input.blur();
            input.dispatchEvent(new Event('focusout', { bubbles: true }));
            if (shadowFields.indexOf(sf) == shadowFields.length - 1) await trueDelay(2000);//await delay(5000);
        }
    }
}


async function startTesting({ fields }) {

    chrome.storage.local.remove('fields');

    if (findPopup()) {

        for (let f of fields) {

            let { fieldNo, start, end, step } = f;

            let info = {                
                inputField: inputs[fieldNo - 1],
                fieldNo, start, end, step,
                current: start,
                incrementCurrent() {

                    this.current += this.step;

                    if (this.current > this.end) {
                        this.current = this.start;
                        this.onCycleComplete(this.fieldNo);
                    }
                },
                onCycleComplete: onCycleComplete
            };

            fieldsInfo.push(info);
            addShadowField(info);

        }

        let totalSteps = findTotalSteps();
        let bestSofar = { value: null, message: null };

        for (let i = 1; i <= totalSteps; i++) {

            chrome.runtime.sendMessage({ message: `${i} of ${totalSteps} steps running` });

            if (i > 1) await fieldsInfo[fieldsInfo.length - 1].incrementCurrent();

            await reflectChanges();

            let message = fieldsInfo.map(fi => `${fi.fieldNo} -> ${fi.current.toFixed(2)}`).join(' | ');

            let result = getValue(item);

            //console.log(`result -> ${result}`);

            if (!bestSofar.value || result >= bestSofar.value) {
                bestSofar.value = result;
                bestSofar.message = message;
            }

            if (cancel) break;

        }

        chrome.runtime.sendMessage({ message: `Best Settings : ${bestSofar.message}` });

    }
}


function findPopup() {

    popup = document.querySelector('#overlap-manager-root [class^="dialog"]');
    backTestWrapper = document.querySelector('.backtesting-content-wrapper');

    if (!popup) {
        chrome.runtime.sendMessage({ message: 'Strategy settings window not found' });
        return false;
    }

    let inputNodes = popup.querySelectorAll('input[inputmode="numeric"]');

    if (!inputNodes || inputNodes.length <= 0) {
        chrome.runtime.sendMessage({ message: 'Fields not found' });
        return false;
    }

    if (!backTestWrapper) {
        chrome.runtime.sendMessage({ message: 'Strategy tester window not open' });
        return false;
    }

    inputs = Array.from(inputNodes);
    return true;

}


function onCycleComplete(fieldNo) {
    let fieldIndex = fieldsInfo.findIndex(e => e.fieldNo == fieldNo);
    if (fieldIndex > 0) fieldsInfo[fieldIndex - 1].incrementCurrent();
}

function findTotalSteps() {
    let steps = fieldsInfo.reduce((p, e) => p * (((e.end - e.start) / e.step) + 1), 1);
    return steps;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function trueDelay(limit) {

    let oValue = getValue(item);
    let timeElapsed = 0, nValue = null, interval = 10;

    do {      
        await delay(interval); timeElapsed += interval; 
        nValue = getValue(item);
    }
    while(timeElapsed <= limit  && oValue == nValue);

    //console.log(timeElapsed);
}

function getValue(option) {
    let rawText = backTestWrapper.querySelector('.report-data').children[option].firstElementChild.innerText;
    return parseFloat(rawText);
}