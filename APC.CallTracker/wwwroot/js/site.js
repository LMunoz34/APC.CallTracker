
initializeVersionUpdater();

function initializeVersionUpdater() {
    setInterval(() => checkVersion(), 60000);
}

function checkVersion() {

    fetch(`./Version/GetAppVersion?currentVersion=${window.apc.currentVersion}&userName=${window.apc.userName}`)
        .then(function (response) {
            return response.json();
        }).then(function (response) {
            if (response.version === window.apc.currentVersion) return;

            //version changed,
            console.log(`Version needs update to ${response.version}`);
            window.apc.appRefreshRequired = true;
        });

    //let response = await(await fetch(`./Version/GetAppVersion?currentVersion=${window.apc.currentVersion}&userName=${window.apc.userName}`)).json();
    
}

//async function checkVersionAsync() {
//    let response = await (await fetch(`./Version/GetAppVersion?currentVersion=${window.apc.currentVersion}&userName=${window.apc.userName}`)).json();
//    if (response.version === window.apc.currentVersion) return;

//    //version changed,
//    console.log(`Version needs update to ${response.version}`);
//    window.apc.appRefreshRequired = true;
//}

function randomId() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

function formatPhoneNumber(phone) {
    if (!phone) return phone;
    if (phone.length < 10) return phone;
    let area = phone.substring(0, 3);
    let npa = phone.substring(3, 6);
    let nxx = phone.substring(6, 10);
    return `${area}-${npa}-${nxx}`;
}

function formatTime(time) {
    return moment(new Date(`01/01/2000 ${time}`)).format('h:mm:ss A');
}