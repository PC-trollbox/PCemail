console.log("Starting updating the structure");
console.log("Getting FS...");
try{
  fs = require("fs")
}catch{
  console.log("Error while getting the users.")
  throw err;
}
console.log("Getting users.json...");
try{
  users = require("./users.json");
}catch(err){
   console.log("Error while getting the users.")
   throw err;
}
console.log("Got users.json!");
console.log("Setting Admin email array...");
var adminEmail = ["PC@PCemail.com", "Nam@Nam", "gay@m.69", "copy@em.com"]
console.log("Admin array set.");
console.log("ForEach loop...");
for (var user in users){
  console.log("Updating the User structure of " + user);
  console.log("Clearing Auth Keys for " + user);
  users[user].keys = [];
  console.log("Cleared Auth Keys for " + user);
  console.log("Deleting 2FA for " + user);
  delete users[user].twofa;
  console.log("Deleted 2FA for " + user);

  if (adminEmail.includes(user)){
    console.log(user + " is Administrator, adding 2FA.");
    users[user].twofa = true;
  }
}
console.log("Local variable updated.");
console.log("Writing variable to users.json...");
fs.writeFile(__dirname + '/users.json', JSON.stringify(users), function(err) {
  if (err) {
    console.log("Error while writing the users.")
    throw err;
  }
  console.log("Users updated successfully.")
});