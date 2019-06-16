/* Information not to be provided */
const token = process.env.TOKEN;
const data = process.env.DATABASE;
const password = process.env.PASSWORD;
const moduleFile = process.env.EXAMINATIONS;

/* Packages */
const mysql = require("mysql");
const Bot = require('node-telegram-bot-api');
const schedule = require("node-schedule");
const modules = require("./modules.js");
const dates = require("./dates.js");

/* Connections initialization */
let bot;

const db = mysql.createConnection({
    host: "remotemysql.com",
    user: data,
    password: password,
    database: data
});

bot = new Bot(token, { polling: true });

db.connect(function(err) {
    if (err) {
        throw err;
    }
    console.log("DB Connected!");
});

/* Scheduling of daily reminders to be located here! */
let rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;
rule.second = 0;

schedule.scheduleJob(rule, function() {
    sendAllPeople();
});

/* Functions */
function sendAllPeople() {
    db.query("SELECT * FROM Users", function(err, result) {
        for (let i = 0; i < result.length; i ++) {
            let user = "" + result[i].username;
            if (result[i].notifications === 'daily') {
                checkModules(user, user);
            } else if (dates.parseDate(result[i].notifications, 10) === Date.getDay()) {
                checkModules(user, user);
            }
        }
    });
}

function modulesList() {
    let statement = "";
    for (let i = 0; i < modules.length; i ++) {
        statement += modules[i];
        statement += "\n";
    }
    return statement;
}

function addNewUser(userID, chatID) {
    if (userID !== chatID) {
        bot.sendMessage(chatID, "Please start a private conversation with me to /register");
    } else {
        db.query("SELECT COUNT(username) AS Presence FROM Users WHERE username = '"
            + userID + "'",
            function(err, result) {
                if (result[0].Presence === 1) {
                    bot.sendMessage(chatID, "You have already been registered");
                } else {
                    db.query("INSERT INTO Users VALUES ('" 
                        + userID + "', '', 'Daily')", function(err, result) {
                            bot.sendMessage(chatID, "Registration Successful!");
                        });
                }
            }); 
    }
}

function removeUser(userID, chatID) {
    if (userID !== chatID) {
        bot.sendMessage(chatID, "Please start a private conversation with me to /unregister");
    } else {
        db.query("SELECT COUNT(username) AS Presence FROM Users WHERE username = '"
            + userID + "'",
            function(err, result) {
                if (result[0].Presence === 0) {
                    bot.sendMessage(chatID, "You have already been unregistered");
                } else {
                    db.query("DELETE FROM Users WHERE username = '" +
                        userID + "'", function(err, result) {
                            bot.sendMessage(chatID, "Unregistration Successful!");
                        });
                }
            }); 
    }
}

function checkModules(userID, chatID) {
    db.query("SELECT * FROM Users WHERE username = '" + userID + "'",
        function(err, result) {
            if (result[0] === undefined) {
                bot.sendMessage(chatID, "Please /register first!");
            } else {
                let arr = split(result[0].modules);
                if (arr.length === 0) {
                    bot.sendMessage(chatID, "You have no upcoming examinations!");
                } else {
                    bot.sendMessage(chatID, "You have the following examinations: ");
                    setTimeout(function(){}, 1000);
                    for (let i = 0; i < arr.length; i ++) {
                        getDate(chatID, arr[i]);
                    }
                }
            }
        });
}

function checkFriendModules(userID, chatID) {
    db.query("SELECT * FROM Users WHERE username = '" + userID + "'",
        function(err, result) {
            if (result[0] === undefined) {
                bot.sendMessage(chatID, 
                    userID + " is invalid or your friend has not registered first!");
            } else {
                let arr = split(result[0].modules);
                if (arr.length === 0) {
                    bot.sendMessage(chatID, "Your friend has no upcoming examinations!");
                } else {
                    bot.sendMessage(chatID, "Your friend has the following examinations: ");
                    setTimeout(function(){}, 1000);
                    for (let i = 0; i < arr.length; i ++) {
                        getDate(chatID, arr[i]);
                    }
                }
            }
        });
}

function countDown(time) {
    const remaining = Math.floor((new Date(time).getTime() - new Date().getTime()) / 1000);
    const seconds = remaining % 60;
    const minutes = Math.floor(remaining / 60) % 60;
    const hours = Math.floor(remaining / 3600) % 24;
    const days = Math.floor(remaining / 86400) % 365;
    return days + " days, " + hours + " hours, " + minutes + " minutes and " + seconds + " seconds left.";
}

function split(modules) {
    let mods = modules.split(",");
    let arr = [];
    for (let i = 0; i < mods.length; i ++) {
        if (mods[i] !== '' && mods[i] !== ' ') {
            arr.push(mods[i]);
        }
    }
    return arr;
}

function getDate(chatID, module) {
    db.query("SELECT * FROM Modules where code = '" + module + "'", function (err, result) {
        bot.sendMessage(chatID, module + ": " + result[0].Title + "\n" + result[0].Date_ 
            + "\n" + countDown(result[0].Date_));
    });
}

function moduleExists(mod) {
    return modules.indexOf(mod) !== -1;
}

function addition(chatID, array, mod) {
    if (array.indexOf(mod) === -1) {
        if (moduleExists(mod)) {
            array.push(mod);
            bot.sendMessage(chatID, "Addition of " + mod + " is Successful!");
        } else {
            bot.sendMessage(chatID, "Addition of " + mod + " is Unsuccessful! Please check again.");
        }
    } else {
        bot.sendMessage(chatID, "Addition of " + mod + " is Unsuccessful! You have already added it.");
    }
}

function removal(chatID, array, mod) {
    if (mod === "Cancel Removal") {
        bot.sendMessage(chatID, "Removal Cancelled!", 
            {
                "reply_markup": {
                    "remove_keyboard": true
                }
            });
    } else {
        array.splice(array.indexOf(mod), 1);
        bot.sendMessage(chatID, "Removal of " + mod + " is Successful!", 
            {
                "reply_markup": {
                    "remove_keyboard": true
                }
            });
    }
}

function getHelpDetails() {
    return "Note the current semester is: Special Term II\n\n" +
        "/add : to add the module to your countdown\n" + 
        "/checkmods : to check the remaining countdown for the modules\n" + 
        "/friendmods : check your friend's examinations\n" + 
        "/listmods : to list the mods available for this semester\n" + 
        "/myid : check your id\n" + 
        "/notifications : to toggle frequency of exam reminders\n" +
        "/register : to register yourself to the server\n" + 
        "/remove : to remove the modules to your countdown\n" + 
        "/unregister : to unregister yourself from the server\m\m" + 
        "/help : to view the list of commands available";
}

function keyboardArray(arr) {
    let array = [];
    for (let i = 0; i < arr.length; i ++) {
        array.push([arr[i]]);
    }
    array.push(["Cancel Removal"]);
    return array;
}

function remove(userID, chatID) {
    db.query("SELECT * FROM Users WHERE username = '" + userID + "'",
        function(err, result) {
            if (result[0] === undefined) {
                bot.sendMessage(chatID, "Please /register first!");
            } else {
                let arr = split(result[0].modules);
                if (arr.length === 0) {
                    bot.sendMessage(chatID, "You have no modules! Please add modules first!"); 
                } else {
                    bot.sendMessage(chatID, "Select a module to remove: ", {
                        "reply_markup": {
                            "keyboard": keyboardArray(arr)
                        }
                    }).then(function () {
                        bot.once("text", function (mod) {
                            removal(chatID, arr, mod.text);
                            db.query("UPDATE Users SET modules = '" 
                                + arr + "' WHERE username = '" + userID + "'", 
                                function(err) {

                                });

                        }); 
                    }); 
                }
            }
        });
}

function push(userID, chatID) {
    db.query("SELECT * FROM Users WHERE username = '" + userID + "'",
        function(err, result) {
            if (result[0] === undefined) {
                bot.sendMessage(chatID, "Please /register first!");
            } else {
                let arr = split(result[0].modules);
                bot.sendMessage(chatID, "Please enter the module to be added!");
                bot.once("text", (mod) => {
                    addition(chatID, arr, mod.text);
                    db.query("UPDATE Users SET modules = '" +
                        arr + "' WHERE username = '" + userID + "'", 
                        function(err) {

                        });
                });
            }
        });
}

function changeNotifications(userID, chatID) {
    db.query("SELECT * FROM Users WHERE username = '" + userID + "'",
        function(err, result) {
            if (result[0] === undefined) {
                bot.sendMessage(chatID, "Please /register first!");
            } else {
                bot.sendMessage(chatID, 
                    "Please set when you want your notifications to occur!",
                    {
                        "reply_markup": {
                            "keyboard": dates.periods
                        }
                    });
                bot.once("text", (msg) => {
                    const stats = msg.text;     
                    bot.sendMessage(chatID, "Change successful!", 
                        {
                            "reply_markup": {
                                "remove_keyboard": true
                            } 
                        });
                    db.query("UPDATE Users SET notifications = '" 
                        + stats + "' WHERE username = '" + userID + "'", 
                        function(err) {

                        });

                });
            }
        });
}

/* Commands */
bot.onText(/\/start/, function (msg) {
    if (msg.text === "/start") {
        bot.sendMessage(msg.chat.id, "Hello World!"); 
    }
});

bot.onText(/\/help/, function (msg) {
    if (msg.text === "/help") {
        bot.sendMessage(msg.chat.id, getHelpDetails());
    }
});

bot.onText(/\/register/, function (msg) {
    if (msg.text === "/register") {
        addNewUser(msg.from.id, msg.chat.id);
    }
});

bot.onText(/\/friendmods/ , function (msg) {
    if (msg.text === "/friendmods") {
        bot.sendMessage(msg.chat.id, "Please key in your friend's ID: ");
        bot.once("text", function (data) {
            checkFriendModules(data.text, msg.chat.id); 
        });
    }
});

bot.onText(/\/myid/, function (msg) {
    if (msg.text === "/myid") {
        bot.sendMessage(msg.chat.id, "Your ID is: " + msg.from.id);
    }
});

bot.onText(/\/checkmods/, function (msg) {
    if (msg.text === "/checkmods") {
        checkModules(msg.from.id, msg.chat.id);
    }
});

bot.onText(/\/listmods/, function (msg) {
    if (msg.text === "/listmods") {
        bot.sendDocument(msg.chat.id, moduleFile);
    }
});

bot.onText(/\/add/, function (msg) {
    if (msg.text === "/add") {
        push(msg.from.id, msg.chat.id);
    }
});

bot.onText(/\/remove/, function (msg) {
    if (msg.text === "/remove") {
        remove(msg.from.id, msg.chat.id);
    }
});

bot.onText(/\/notifications/, function (msg) {
    if (msg.text === "/notifications") {
        changeNotifications(msg.from.id, msg.chat.id);
    }
});

bot.onText(/\/unregister/, function (msg) {
    if (msg.text === "/unregister") {
        removeUser(msg.from.id, msg.chat.id);
    }
});

/* Exports */

module.exports = bot;

