console.log("Starting updating the admins...");
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
console.log("Setting admin emails...");
var adminEmail = ["PC@PCemail.com", "Nam@Nam", "gay@m.69", "copy@em.com"]
console.log("Admin emails set!");
console.log("ForEach loop...");
for (var user in users){
  console.log("Checking " + user + "...");
  if (adminEmail.includes(user)){
    console.log("Administrator, verifying...");
    users[user].verified = true;
    console.log("Verified " + user + "!");
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