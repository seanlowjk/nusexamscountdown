let dates = {
    "periods": [["Daily"], ["Monday"], ["Tuesday"], ["Wednesday"], ["Thursday"], 
        ["Friday"], ["Saturday"], ["Sunday"], ["Off"]],

    "parseDate": function(date) {
        if (date === "Monday") {
            return 1;
        } else if (date === "Tuesday") {
            return 2;
        } else if (date === "Wednesday") {
            return 3;
        } else if (date === "Thursday") {
            return 4;
        } else if (date === "Friday") {
            return 5;
        } else if (date === "Saturday") {
            return 6;
        } else if (date === "Sunday") {
            return 0;
        } else if (date === "Daily") {
            return 999;
        } else if (date === "Off") {
            return 555;
        }
    }
}

module.exports = dates;
