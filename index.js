const express = require('express');
var users = require("./users.json")
const app = express();
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
app.use(cookieParser("PCEmail-SecretData"))
app.use(bodyParser.urlencoded({
    extended: true
}));
var adminEmail = ["admins@please.list"]
var authCodesActive = {};
var fs = require("fs")
var he = require("he")
var IsCoding = false;
app.enable("trust proxy")
var IPRateLimitsAttempts = {}
const {
    encrypt,
    decrypt
} = require('./encoderDecoder');
app.use(function(req, res, next) {
    if (IsCoding && req.originalUrl != "/login" && req.originalUrl != "/admin" && req.originalUrl != "/Code") {
        res.status(503).send("The platform is being in coding. Try again later.<br><button><a href=\"/admin\">Admin control panel</a></button>")
    } else {
        if (req.signedCookies["username"] == undefined) {
            next()
        } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
            next()
        } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
            if (users[req.signedCookies["username"]].banned == true) {
                res.status(403).send("Forbidden: Your account was BANNED from this service.")
            } else if (IsCoding && req.originalUrl == "/login") {
                res.status(503).send("The platform is being in coding. Try again later.<br><button><a href=\"/admin\">Admin control panel</a></button>")
            } else {
                next()
            }
        } else {
            next()
        }
    }
})
app.use(function(req, res, next) {
    if (req.signedCookies["username"] == undefined) {
        next()
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        next()
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (adminEmail.includes(req.signedCookies["username"])) {
            if (users[req.signedCookies["username"]].twofa == undefined) {
                res.send("Invalid setting for 2FA: Admins must have 2FA. Update the user structure.")
            } else {
                next()
            }
        } else {
            next()
        }
    } else {
        next()
    }
})
app.use(function(req, res, next) {
    if (req.headers["x-forwarded-proto"] == "http") {
        if (req.signedCookies["otherprotocol"] == "on") {
            next();
        } else {
            if (req.query.check == "on") {
                res.cookie("otherprotocol", req.query.check, {
                    signed: true
                })
                res.redirect("/")
            } else {
                res.sendFile(__dirname + "/mayBeInsecure.html")
            }
        }
    } else {
        next()
    }
})
app.post("/backup", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (users[req.signedCookies["username"]].backupkeys == req.body.key) {
            users[req.signedCookies["username"]].keys.push(req.headers['x-forwarded-for'])
            if (users[req.signedCookies["username"]].backupkeys == "Administrator"){
              users[req.signedCookies["username"]].backupkeys = between(1000000000, 9999999999).toString();
              res.send("Authorized, new key is " + users[req.signedCookies["username"]].backupkeys + ". Do not mess up and write up.")
            }else{
              res.redirect("/login")
            }
        } else {
            res.redirect("/login")
        }
    } else {
        res.redirect("/login")
    }
})

app.use(function(req, res, next){
    if (req.signedCookies["username"] == undefined) {
        next()
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        next()
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
      if (users[req.signedCookies["username"]].twofa == undefined){
        next()
      }else{
        if(users[req.signedCookies["username"]].keys.includes(req.headers['x-forwarded-for']) || (req.originalUrl == "/backup" && req.method == "post")){
          next()
        }else{
          fs.readFile(__dirname + "/unauthorized.html", function(err, data){
            var data2 = data.toString();
            data2 = data2.replace("{IP}", req.headers['x-forwarded-for']);
            res.send(data2)
          })
        }
      }
    } else {
      next()
    }
})
app.get("/backup", function(req, res){
  if (req.signedCookies["username"] == undefined) {
        res.redirect("/")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
      if (users[req.signedCookies["username"]].twofa == undefined){
        res.redirect("/")
      }else{
          res.send(users[req.signedCookies["username"]].backupkeys)
      }
    } else {
      res.redirect("/")
    }
})
app.post("/dev", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (users[req.signedCookies["username"]].developer == undefined) {
            res.send("who you even are?")
        } else {
            eval(req.body.content);
        }
    } else {
        res.redirect("/")
    }
})

function AutoSaving() {
    fs.writeFile(__dirname + '/users.json', JSON.stringify(users), function(err) {
        if (err) {
            throw err;
        }
    });
    users = require("./users.json");
    setTimeout(function() {
        AutoSaving()
    }, 1000)
}
AutoSaving();
app.use(function(req, res, next) {
    if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == undefined) {
        IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
    }
    next()
})
String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

function hashIt(h) {
    var hash = 0;
    if (h.length == 0) {
        return hash;
    }
    for (var i = 0; i < h.length; i++) {
        var char = h.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function uuid(txt) {
    seed = hashIt(txt);

    function random() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function choose(arr) {
        return arr[Math.floor(random() * (arr.length - 1))];
    }
    letters = 'QWERTYUIOPASDFGHJKLZXCVBNM1234567890'.split('');
    dip = 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX';
    dd = '';
    dip.split('').forEach(char => {
        if (char !== 'X') {
            dd += char;
        } else {
            dd += choose(letters);
        }
    });
    return dd;
}
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/mail.html")
});
app.get("/login", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
            res.sendFile(__dirname + "/mailLoginNoAttempts.html")
        } else {
            res.sendFile(__dirname + "/mailLogin.html")
        }
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
            res.sendFile(__dirname + "/mailLoginNoAttempts.html")
        } else {
            res.sendFile(__dirname + "/mailLoginUsername.html")


        }
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        fs.readFile(__dirname + "/accessGranted.html", function(err, data) {
            if (err) {
                res.status(500).send("Something is wrong, well contact the amdin.")
            } else {
                var mail = "";
                for (var yeah in users[req.signedCookies["username"]].email) {
                    var dedcode = users[req.signedCookies["username"]].email[yeah].author;

                    if (users[users[req.signedCookies["username"]].email[yeah].author].hasOwnProperty("verified")) {
                        dedcode = dedcode + "<img src=\"/verified-account.png\" height=26 width=26></img>"
                    }

                    if (users[users[req.signedCookies["username"]].email[yeah].author].hasOwnProperty("developer")) {
                        dedcode = dedcode + "<img src=\"/dev.png\" height=26 width=26></img>"
                    }
                    if (req.query.ascriptEnabled == "1") {
                        mail = mail + "<hr><h1>" + he.encode(users[req.signedCookies["username"]].email[yeah].title) + "</h1><form action=\"/DeleteLetter\" method=\"post\"><input name=\"count\" type=\"hidden\" value=\"" + yeah + "\"></input><button>Clear this letter</button></form><br><p>Written by: " + dedcode + "<br><br><br>" + decrypt(he.encode(users[req.signedCookies["username"]].email[yeah].content), users[req.signedCookies["username"]].password).replace("<ascri>", "<script>").replace("</ascri>", "</script>").replace(/(?:\r\n|\r|\n)/g, '<br>') + "<br>";
                    } else {
                        mail = mail + "<hr><h1>" + he.encode(users[req.signedCookies["username"]].email[yeah].title) + "</h1><form action=\"/DeleteLetter\" method=\"post\"><input name=\"count\" type=\"hidden\" value=\"" + yeah + "\"></input><button>Clear this letter</button></form><br><p>Written by: " + dedcode + "<br><br><br>" + decrypt(he.encode(users[req.signedCookies["username"]].email[yeah].content), users[req.signedCookies["username"]].password).replace("<ascri>", "The following content is JavaScript, rendering is disabled by default for security reasons. You can <a href=\"/login?ascriptEnabled=1\">enable scripts</a>.\n").replace("</ascri>", "\n---Not a script part---").replace(/(?:\r\n|\r|\n)/g, '<br>') + "<br>";
                    }
                }
                var use = users[req.signedCookies["username"]].verified == undefined ? req.signedCookies["username"] : req.signedCookies["username"] + "<img src=\"/verified-account.png\" height=26 width=26></img>";
                if (users[req.signedCookies["username"]].developer == undefined) {} else {
                    use = use + "<img src=\"/dev.png\" height=26 width=26></img>";
                }
                var data2 = data.toString();
                data2 = data2.replace("%MAILHERE%", mail);
                data2 = data2.replace("%USERNAME%", use);
                if (users[req.signedCookies["username"]].twofa == undefined) {
                    data2 = data2.replace("%2fabuttons%", "<button><a href=\"/blocklist\">Blocked users</a></button> | 2FA is disabled, enable 2FA.")
                } else {
                    data2 = data2.replace("%2fabuttons%", "<button><a href=\"/blocklist\">Blocked users</a></button> | <button><a href=\"/authIP\">Auth IP</a></button> | <button><a href=\"/backup\">Backup code</a></button>")
                }
                res.send(data2)
            }
        })
    } else {
        if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
            res.sendFile(__dirname + "/mailLoginNoAttempts.html")
        } else {
            res.sendFile(__dirname + "/mailLoginUsername.html")
        }
    }
})
app.get("/verified-account.png", function(req, res) {
    res.sendFile(__dirname + "/verified-account.png")
})
app.get("/dev.png", function(req, res) {
    res.sendFile(__dirname + "/dev.png")
})
app.get("/2fa", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (adminEmail.includes(req.signedCookies["username"])) {
            res.send("Invalid setting for 2FA: Admins cannot modify that setting.")
        } else {
            if (users[req.signedCookies["username"]].twofa == undefined) {
                users[req.signedCookies["username"]].twofa = true;
                users[req.signedCookies["username"]].backupkeys = between(1000000000, 9999999999).toString();
                users[req.signedCookies["username"]].keys.push(req.headers['x-forwarded-for']);
                res.send("Write down the backup key: " + users[req.signedCookies["username"]].backupkeys + " and <a href=\"/login\">Return to mailbox</a>.")
            } else {
                users[req.signedCookies["username"]].keys = [];
                users[req.signedCookies["username"]].backupkeys = "";
                delete users[req.signedCookies["username"]].twofa;
                res.redirect("/login")
            }
            
        }
    } else {
        res.redirect("/")
    }
})
app.get("/authIP", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        res.sendFile(__dirname + "/formAuthIP.html");
    } else {
        res.redirect("/")
    }
})
app.post("/authIP", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        users[req.signedCookies["username"]].keys.push(req.body.ip);
        res.redirect("/login")
    } else {
        res.redirect("/")
    }
})
app.get("/CreateLetter", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        res.sendFile(__dirname + "/createLetter.html")
    } else {
        res.redirect("/login")
    }
})
app.get("/email", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.status(403).send("Forbidden: No log-in cookie found")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.status(403).send("Forbidden: Invalid username")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        var email = JSON.parse(JSON.stringify(users[req.signedCookies["username"]].email));
        for (var letter in email) {
            email[letter].content = decrypt(email[letter].content, users[req.signedCookies["username"]].password)
        }
        res.json(email)
    } else {
        res.status(403).send("Forbidden: Invalid password")
    }
})
app.get("/register", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.sendFile(__dirname + "/register.html")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.sendFile(__dirname + "/register.html")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        res.redirect("/login")
    } else {
        res.sendFile(__dirname + "/register.html")
    }
})
app.post("/deleteUsername", function(req, res) {
    res.clearCookie("username");
    res.clearCookie("password");
    res.redirect("/")
})
app.post("/register", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        if (!users.hasOwnProperty(req.body.username)) {

            var hask = encrypt("Welcome to the system, have fun.", uuid(req.body.password));
            users[req.body.username] = {
                password: uuid(req.body.password),
                email: [{
                    title: "Welcome to the system!",
                    author: "system@pcemail.com",
                    content: hask
                }],
                keys: [],
                backupkeys: ""
            }
            res.redirect("/login")
        } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
            var hask = encrypt("Welcome to the system, have fun.", uuid(req.body.password));
            users[req.body.username] = {
                password: uuid(req.body.password),
                email: [{
                    title: "Welcome to the system!",
                    author: "system@pcemail.com",
                    content: hask
                }],
                keys: [],
                backupkeys: ""
            }
        }
        res.redirect("/login")

    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        res.redirect("/login")
    } else {
        if (!users.hasOwnProperty(req.body.username)) {
            var hask = encrypt("Welcome to the system, have fun.", uuid(req.body.password));
            users[req.body.username] = {
                password: uuid(req.body.password),
                email: [{
                    title: "Welcome to the system!",
                    author: "system@pcemail.com",
                    content: hask
                }],
                keys: [],
                backupkeys: ""
            }
        }
        res.redirect("/login")

    }
})
app.post("/DeleteLetter", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        users[req.signedCookies["username"]].email.splice(req.body.count, 1);
        res.redirect("/login")
    } else {
        res.redirect("/login")
    }
})
app.get("/blocklist", function(req, res){
  if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        fs.readFile(__dirname + "/blocklist.html", function(err, data){
          if (err) throw err;
          var data2 = data.toString();
          var no = "";
          for (var node in users[req.signedCookies["username"]].blacklist){
            no = no + users[req.signedCookies["username"]].blacklist[node] + " | <button><a href=\"/unblock?member="+node+"\">unblock</a></button><br><hr><br>";
          }
          data2 = data2.replace("$BLOCKED$", no);
          res.send(data2);
        })
    } else {
        res.redirect("/login")
    }
})
app.get("/unblock", function(req, res){
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (users[req.signedCookies["username"]].blacklist[req.query.member] == undefined){
          res.send("not blocked, go away back.")
        }else{
          users[req.signedCookies["username"]].blacklist.splice(req.query.member, 1)
          res.redirect("/blocklist")
        }
    } else {
        res.redirect("/login")
    }
})
app.get("/block", function(req, res){
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (users[req.signedCookies["username"]].blacklist.indexOf(req.query.member) != -1){
          res.send("alr blocked, go away back.")
        }else{
          users[req.signedCookies["username"]].blacklist.push(req.query.member);
          res.redirect("/blocklist")
        }
    } else {
        res.redirect("/login")
    }
})
app.get("/admin", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        fs.readFile(__dirname + "/admin.html", function(err, data) {
            if (err) return res.send("Error");
            var data2 = data.toString();
            if (!adminEmail.includes(req.signedCookies["username"])) {
                data2 = data2.replace("%admincontrols%", "Not an admin.");
                data2 = data2.replace("%users%", "Failed to load users data.");
                res.status(403).send(data2)
            } else {
                var codemepls = IsCoding ? "No longer coding" : "Coding"
                var usershtml = "";
                for (var us in users) {
                    var localIzed = users[us].banned ? "Unban member" : "Ban member";
                    var local2 = users[us].verified == undefined ? "Verify member" : "Unverify member";
                    usershtml = usershtml + "<br><hr><br><b>" + he.encode(us) + "</b> | <button><a href=\"/VerifyMember?member=" + encodeURIComponent(he.encode(us)) + "\">" + local2 + "</a></button> | <button><a href=\"/BanMember?member=" + encodeURIComponent(he.encode(us)) + "\">" + localIzed + "</a></button> | <button><a href=\"/RemoveMember?member=" + encodeURIComponent(he.encode(us)) + "\">Remove member</a></button><br>"
                }
                var youddi = Object.keys(authCodesActive).length == 0 ? "<button disabled>No keys to revoke</button>" : "<button><a href=\"/RevokeKeys\">Revoke keys</a></button>"
                data2 = data2.replace("%admincontrols%", "<button><a href=\"/ShutDown\">Shut down this site.</a></button> | <button><a href=\"/Code\">" + codemepls + "</a></button> | " + youddi);
                data2 = data2.replace("%users%", usershtml);
                res.send(data2)
            }
        })
    } else {
        res.redirect("/login")
    }
})

app.get("/ShutDown", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!adminEmail.includes(req.signedCookies["username"])) {
            res.status(403).send("Admin status?!?!?!?")
        } else {
            IsCoding = true;
            res.send("Server is terminating.");
            process.exit();
        }
    } else {
        res.redirect("/login")
    }
})
app.get("/Code", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!adminEmail.includes(req.signedCookies["username"])) {
            res.status(403).send("Admin status?!?!?!?")
        } else {
            IsCoding = !IsCoding;
            res.redirect("/admin");
        }
    } else {
        res.redirect("/login")
    }
})
app.get("/BanMember", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!adminEmail.includes(req.signedCookies["username"])) {
            res.status(403).send("Admin status?!?!?!?")
        } else {
            if (users.hasOwnProperty(req.query.member) && req.query.member !== undefined) {
                if (!adminEmails.includes(req.query.member)) {
                    var shouldBanned = users[req.query.member].banned ? undefined : true
                    users[req.query.member].banned = shouldBanned;
                    if (shouldBanned == undefined) {
                        delete users[req.query.member].banned;
                    }
                    res.redirect("/admin")
                } else {
                    res.send("Member is not bannable.")
                }
            } else {
                res.status(404).send("Member not found. Banning unrealible.")
            }
        }
    } else {
        res.redirect("/login")
    }
})
app.get("/VerifyMember", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!adminEmail.includes(req.signedCookies["username"])) {
            res.status(403).send("Admin status?!?!?!?")
        } else {
            if (users.hasOwnProperty(req.query.member) && req.query.member !== undefined) {
                if (adminEmail.req.query.member) {
                    if (users[req.query.member].verified !== true) {
                        users[req.query.member].verified = true;
                    } else {
                        delete users[req.query.member];
                    }
                    res.redirect("/admin")
                } else {
                    res.send("Member is not unverifiable.")
                }
            } else {
                res.status(404).send("Member not found. Verifying unrealible.")
            }
        }
    } else {
        res.redirect("/login")
    }
})
app.get("/RemoveMember", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!adminEmail.includes(req.signedCookies["username"])) {
            res.status(403).send("Admin status?!?!?!?")
        } else {
            if (users.hasOwnProperty(req.query.member) && req.query.member !== undefined) {
                if (!adminEmail.includes(req.query.member)) {
                    users[req.query.member] = undefined;
                    delete users[req.query.member];
                    res.redirect("/admin")
                } else {
                    res.send("Member is not removeable.")
                }
            } else {
                res.status(404).send("Member not found. Banning unrealible.")
            }
        }
    } else {
        res.redirect("/login")
    }
})
app.post("/ClearAll", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        users[req.signedCookies["username"]].email = []
        res.redirect("/login")
    } else {
        res.redirect("/login")
    }
})
app.post("/CreateLetter", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!users.hasOwnProperty(req.body.username) || users[req.body.username].blacklist.includes(req.signedCookies["username"])) {
            res.send("If you even wondered, there is no such email.")
        } else {
            var hask = encrypt(req.body.content, uuid(users[req.signedCookies["username"]].password));
            users[req.body.username].email.push({
                title: req.body.title,
                content: hask,
                author: req.signedCookies["username"]
            })
            res.redirect("/login")
        }
    } else {
        res.redirect("/login")
    }
})
app.post("/login", function(req, res) {
    if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] != 0) {
        res.cookie("username", req.body.username, {
            signed: true,
            maxAge: 1000 * 60 * 60 * 24 * 14
        })
        res.cookie("password", uuid(req.body.password), {
            signed: true,
            maxAge: 1000 * 60 * 60 * 24 * 14
        }) //no way hackercats! :)
        if (users.hasOwnProperty(req.body.username)) {
            if (users[req.body.username].password == uuid(req.body.password)) {
                IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
            } else {
                IPRateLimitsAttempts[req.headers['x-forwarded-for']]--;
            }
        } else {
            IPRateLimitsAttempts[req.headers['x-forwarded-for']]--;
        }
        if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
            setTimeout(function() {
                IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
            }, 60000)
        }
    } else {

    }
    res.redirect("/login")

})
app.get("/easyAuth", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.sendFile(__dirname + "/easyAuth.html")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.sendFile(__dirname + "/easyAuth.html")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        res.redirect("/login")
    } else {
        res.sendFile(__dirname + "/easyAuth.html")
    }
})
app.get("/RevokeKeys", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        if (!adminEmail.includes(req.signedCookies["username"])) {
            res.status(403).send("Admin status?!?!?!?")
        } else {
            if (Object.keys(authCodesActive).length == 0) {
                res.status(404).send("Keys not found")
            } else {
                authCodesActive = {};
                res.redirect("/admin")
            }
        }
    } else {
        res.redirect("/login")
    }
})

app.post("/easyAuth", function(req, res) {
    if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] != 0) {
        if (req.signedCookies["username"] == undefined) {
            if (authCodesActive.hasOwnProperty(req.body.login)) {
                res.cookie("username", authCodesActive[req.body.login].username, {
                    signed: true,
                    maxAge: 1000 * 60 * 60 * 24 * 14
                })
                res.cookie("password", authCodesActive[req.body.login].password, {
                    signed: true,
                    maxAge: 1000 * 60 * 60 * 24 * 14
                })
                delete authCodesActive[req.body.login];
                IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
                res.redirect("/login")
            } else {
                res.status(403).send("403 Forbidden: This key was not found or was typed incorrectly.")
                IPRateLimitsAttempts[req.headers['x-forwarded-for']]--;
                if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
                    setTimeout(function() {
                        IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
                    }, 60000)
                }
            }
        } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
            if (authCodesActive.hasOwnProperty(req.body.login)) {
                res.cookie("username", authCodesActive[req.body.login].username, {
                    signed: true,
                    maxAge: 1000 * 60 * 60 * 24 * 14
                })
                res.cookie("password", authCodesActive[req.body.login].password, {
                    signed: true,
                    maxAge: 1000 * 60 * 60 * 24 * 14
                })
                delete authCodesActive[req.body.login];
                IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
                res.redirect("/login")
            } else {
                res.status(403).send("403 Forbidden: This key was not found or was typed incorrectly.")
                IPRateLimitsAttempts[req.headers['x-forwarded-for']]--;
                if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
                    setTimeout(function() {
                        IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
                    }, 60000)
                }
            }
        } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
            res.redirect("/login")
        } else {
            if (authCodesActive.hasOwnProperty(req.body.login)) {
                res.cookie("username", authCodesActive[req.body.login].username, {
                    signed: true,
                    maxAge: 1000 * 60 * 60 * 24 * 14
                })
                res.cookie("password", authCodesActive[req.body.login].password, {
                    signed: true,
                    maxAge: 1000 * 60 * 60 * 24 * 14
                })
                delete authCodesActive[req.body.login];
                IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
                res.redirect("/login")
            } else {
                res.status(403).send("403 Forbidden: This key was not found or was typed incorrectly.")
                IPRateLimitsAttempts[req.headers['x-forwarded-for']]--;
                if (IPRateLimitsAttempts[req.headers['x-forwarded-for']] == 0) {
                    setTimeout(function() {
                        IPRateLimitsAttempts[req.headers['x-forwarded-for']] = 3;
                    }, 60000)
                }
            }
        }
    } else {
        res.status(403).send("403 Forbidden: 3 attempts reached. Try again after 1 minute.")
    }
})
app.get("/Get4Digit", function(req, res) {
    if (req.signedCookies["username"] == undefined) {
        res.redirect("/login")
    } else if (users.hasOwnProperty(req.signedCookies["username"]) == false) {
        res.redirect("/login")
    } else if (req.signedCookies["password"] == users[req.signedCookies["username"]].password) {
        var fourDigit = between(1000, 9999)
        authCodesActive[fourDigit] = {
            username: req.signedCookies["username"],
            password: req.signedCookies["password"]
        }
        res.send("1-key auth: <b>" + fourDigit.toString() + "</b>")
    } else {
        res.redirect("/login")
    }
})

function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    )
}

app.listen(3000, () => {
    console.log('server started');
});
