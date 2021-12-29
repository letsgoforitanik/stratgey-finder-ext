let list = document.querySelector('#list');
let btnAdd = document.querySelector('#btnAdd');
let btnRemove = document.querySelector('#btnRemove');
let btnFindSettings = document.querySelector('#btnFindSettings');
let divResult = document.querySelector('#result');
let btnCancel = document.querySelector('#btnCancel');
let firstInputs = document.querySelectorAll('input');


chrome.runtime.onMessage.addListener(onMessageReceived);
firstInputs.forEach(e => e.addEventListener('keypress', preventNonNumeric));

btnAdd.onclick = function () {

    let html = `<input type="text" placeholder="Field No.">
                <input type="text" placeholder="Step">
                <input type="text" placeholder="Start">
                <input type="text" placeholder="End">`;

    let divFieldData = document.createElement('div');
    divFieldData.classList.add('field-data');
    divFieldData.innerHTML = html;
    list.appendChild(divFieldData);
    Array.from(divFieldData.children).forEach(e => e.addEventListener('keypress', preventNonNumeric));

};

document.onkeyup = function (e) {
    if (e.key == "+") btnAdd.dispatchEvent(new Event('click', { bubbles: true }));
    if (e.key == "-") btnRemove.dispatchEvent(new Event('click', { bubbles: true }));
    if (e.key == "Enter") btnFindSettings.dispatchEvent(new Event('click', { bubbles: true }));
}

function preventNonNumeric(evt) {
    if (evt.charCode != 46 && (evt.charCode < 48 || evt.charCode > 57)) evt.preventDefault();
}


btnRemove.onclick = function () {

    if (list.children.length > 1) {
        list.removeChild(list.lastChild);
    }

};

btnCancel.onclick = async function () {

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { cancel: true });
}


btnFindSettings.onclick = function () {

    let fields = [];

    for (let i = 0; i < list.childElementCount; i++) {

        let fieldInfo = list.children[i];

        let fieldNumber = parseFloat(fieldInfo.children[0].value);
        let step = parseFloat(fieldInfo.children[1].value);
        let start = parseFloat(fieldInfo.children[2].value);
        let end = parseFloat(fieldInfo.children[3].value);

        if (isNaN(fieldNumber) || isNaN(step) || isNaN(start) || isNaN(end)) {
            divResult.innerText = `One or more field(s) on row ${i + 1} are not numbers`;
            return;
        }

        if (!validateTotalSteps(getTotalSteps(step, start, end))) {
            divResult.innerText = `Invalid steps on row ${i + 1}`;
            return;
        }

        fields.push({ fieldNo: fieldNumber, step: step, start: start, end: end });

    }

    chrome.storage.local.set({ fields }, injectContentScript);

};


async function injectContentScript() {

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
}


function getTotalSteps(step, start, end) {
    return (((end - start) / step) + 1);
}

function validateTotalSteps(steps) {
    let intSteps = parseInt(steps);
    return Math.abs(steps - intSteps) == 0 && intSteps >= 1;
}

function onMessageReceived({ message }) {
    divResult.innerText = message;
}
