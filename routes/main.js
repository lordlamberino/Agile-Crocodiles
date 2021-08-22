module.exports = (app) => {
    let bookInfo = []; // To store json objects for books in the wish list.
    let userSetting = [];
    queryUsersetting();
    queryWishlist(); // Get the wish list beforehands.

    app.get("/",(req, res) => {
        res.render("index.ejs", {title: "Main"});
    })

    app.get("/addbooks",(req, res) => {

        let info = {
            title : "",
            author : "",
            cover : "",
            ISBN : "",
            description : "",
            adultContent : "",
            genre : ""
        }

        res.render("addbooks.ejs", {title: "Add Books", bookInfo: info, matchingBookInfo: info, flag : "i"});
    })

    app.get("/match",(req, res) => {
        let query = [];
        for (let genre of userSetting){
            query.push("SELECT title.name, author.author, cover.link FROM author RIGHT JOIN title ON author.ID = title.authorID LEFT JOIN cover ON title.ID = cover.titleID WHERE genreID = (SELECT ID FROM genre WHERE name = '"+genre+"')");
        }
    
        query.push("SELECT title.name, oneliner.oneline FROM title LEFT JOIN oneliner ON title.ID = oneliner.titleID");

        connection.query(query.join(";"), (err, results) =>{
            if (err) throw err;
            let oneliner = {};

            Object(results.slice(-1).flat()).forEach((data)=>{ // the oneliner is the very last element in the main query result array.
               if(oneliner.hasOwnProperty(data.name) == false){
                    let onelineTempArray = []
                    onelineTempArray.push(data.oneline)
                    oneliner[data.name] = onelineTempArray;
               }else{
                   let onelineTempArray = oneliner[data.name];
                   onelineTempArray.push(data.oneline);
                   oneliner[data.name] = onelineTempArray;
               }
            })
            oneliner = JSON.stringify(oneliner);
            bookResult = results.slice(0, -1).flat(); // flatten several arrays of queried books into one array.
            res.render("match.ejs", {title: "Match", bookInfo: bookResult, flag : "", oneliner: oneliner});
        })
    })

    app.post("/addbooks", (req, res) =>{
        let url = encodeURI(formURL(req.body));
        request(url, {json: true}, (err, response, body)=> {

            let info = {
                title : "",
                author : "",
                cover : "",
                ISBN : "",
                description : "",
                adultContent : "",
                genre : ""
            }

            if(err) {
                flag = "n"
            }
            else{
                if(typeof body.items === "undefined"){
                    flag = "n"
                }
                else{
                    info.title = body.items[0].volumeInfo.title;
                    info.author = body.items[0].volumeInfo.authors;
                    info.publisher = body.items[0].volumeInfo.publisher;

                    try{
                        info.adultContent = body.items[0].volumeInfo.maturityRating;
                    }catch{
                        info.adultContent = ""
                    }

                    try{
                        info.description = body.items[0].volumeInfo.description.substring(0, 200) + "...";
                    }catch{
                        info.description = "";
                    }

                    try{
                        info.genre = body.items[0].volumeInfo.categories[0];
                    }
                    catch{
                        info.genre = "unknown";
                    }

                    try{
                        info.ISBN = body.items[0].volumeInfo.industryIdentifiers[1].identifier;
                    }
                    catch{
                        info.ISBN = "";
                    }

                    try{
                        info.cover = body.items[0].volumeInfo.imageLinks.thumbnail;
                    }
                    catch{
                        info.cover = "";
                    }
                    flag = "y"
                }
            }

            let query = [];

            for (let genre of userSetting){
                query.push("SELECT title.name, author.author, cover.link FROM author RIGHT JOIN title ON author.ID = title.authorID LEFT JOIN cover ON title.ID = cover.titleID WHERE genreID = (SELECT ID FROM genre WHERE name = '"+genre+"')");
            }

            connection.query(query.join(";"), (err, results) =>{
                if (err) throw err;
                res.render("addbooks.ejs", {title: "Add Books", bookInfo: results, matchingBookInfo: info, flag : flag});
            })

        })

    })

    app.post("/addbooks/add", (req, res) => {
        let adultContent = false;
        if(req.body.adultContent != "NOT_MATURE")
        {
            adultContent = true
        }

        connection.query("INSERT INTO author (author) VALUES ('" + req.body.author+"')", (err) => {
            console.log("This author is already in the database.");
        });

        connection.query("INSERT INTO genre (name) VALUES ('"+ req.body.genre+"')", (err)=> {
            console.log("This genre is already in the database.");
        });

        let query2 = ["INSERT INTO title (name, authorID, ISBN, adultContent, genreID) VALUES ('" + req.body.title + "',"
                        + "(SELECT ID FROM author WHERE author = '"+ req.body.author+"')" + ",'"
                        + req.body.ISBN + "'," + adultContent +", (SELECT ID FROM genre WHERE name = '" + req.body.genre + "'))"];
        connection.query(query2.join(";"), (err, results) => {
            if(err) {
                req.session.message = {
                    type: 'danger',
                    intro: 'Fail!',
                    message: 'This book is already in the database.'
                }
                res.redirect("/addbooks");
            }
            else{
                let query3 = "INSERT INTO cover (titleID, link) VALUES ( (SELECT ID FROM title WHERE name = '"+ req.body.title+ "'), '"+ req.body.link + "')";
                connection.query(query3, (err, results) => {
                    console.log("A new book is added to the database.")
                    req.session.message =  {
                    type: 'success',
                    intro: 'Success!',
                    message: 'The book is successfully added to the database.'
                    }
                    res.redirect("/addbooks");
                })
            }
        })
    })

    app.get("/profile",(req, res) => {
        let query = "SELECT * FROM genre";
        connection.query(query, (err, results)=> {
            if(err)
            {
                res.render("profile.ejs", {title: "Profile", savedGenre : [], userSetting : []});
            }
            else{
                res.render("profile.ejs", {title: "Profile", savedGenre : results, userSetting : userSetting});
            }
        })
    })

    app.post("/profile/genre", (req, res) => {
        let preference = savePreference(req.body.genre);
        let query = ["INSERT INTO userProfile (userIDNum, preference) VALUES (9, " + preference + ")"];
        connection.query(query.join(";"), (err, results) => {
            if (err) // If INSERT fails, then there is already a saved preference for this user. So, UPDATE is required.
            {
                let query = ["UPDATE userProfile SET preference = '" + preference + "' WHERE USERIDNum = 9"];
                connection.query(query.join(";"), (err, results) => {
                    if(err) throw err;
                    console.log("User preference has been saved.")
                    queryUsersetting();
                });
            }
        })
        req.session.message =  {
            type: 'success',
            intro: 'Success!',
            message: 'The user genre preference has been saved.'
        }
        res.redirect("/profile"); // either UPDATE or INSERT is successful.
    });

    //savePreference function processes the user's genre choices by concatenating them in a one single string by semi-colon
    // and save it to the DB.
    function savePreference(input)
    {
        if(typeof input == "string") // Only one genre was selected by the user.
        {
            return input + ";"
        }
        else if (typeof input == "undefined")
        {
            return ""
        }
        else{
            let preference = ""
            for(let i = 0; i < input.length; i++)
            {
                preference = preference + input[i]+";"
            }
            return preference
        }
    }

    app.get("/wishlist", (req, res) => {
        var clean = bookInfo.filter((arr, index, self) =>
        index === self.findIndex((t) => (t.title === arr.title && t.cover === arr.cover))); // remove duplicate json from bookInfo
        res.render("wishlist.ejs", {title: "Wishlist", bookInfo : clean});
    })

    function formURL(obj){
        let begin = "https://www.googleapis.com/books/v1/volumes?q=";
        let end = "&key=AIzaSyDUce_hTpbDcVBlm5h7TgExyjZ-httMvNk&maxResults=1&langRestrict=en";

        if(obj.title !== ""){
            begin = begin + obj.title;
        }
        if(obj.author !== ""){
            begin = begin + "+inauthor:" + obj.author;
        }
        if(obj.ISBN !== ""){
            begin = begin + "+isbn:" + obj.ISBN;
        }
        if(obj.publisher !== ""){
            begin = begin + "+inpublisher:" + obj.publisher;
        }

        return begin + end;
    }
    function formatData(queryResults)
    {
        let json = {
            title : queryResults[0][0].name,
            author : queryResults[1][0].name,
            cover : queryResults[2][0].link
        };
        bookInfo.push(json);
    }

    function queryWishlist(){
        let id = "user1";
        let query = ["SELECT * FROM wishlist WHERE userIDNum = (SELECT ID FROM credential WHERE userID ='" + id +"')"];
        return new Promise((resolve, reject) => {
            connection.query(query.join(';'), (err, results) =>{
            if(err) reject(err);
            for(let i = 0; i < results.length; i++)
                    {
                        let innerQuery = ["SELECT name FROM title WHERE ID = " + results[i].titleID,
                                        "SELECT author FROM author WHERE ID = (SELECT authorID FROM title where ID = " + results[i].titleID + ")",
                                        "SELECT link FROM cover WHERE titleID = " + results[i].titleID];

                        connection.query(innerQuery.join(';'), (err, qResults) => {
                            if (err) reject(err);
                            else
                                resolve(formatData(qResults));
                        });
                    }
            })
        })
    }

    function queryUsersetting(){
        let query = ["SELECT preference FROM userprofile WHERE userIDNum = 9"];
        return new Promise((resolve, reject) => {
            connection.query(query.join(";"), (err, results) => {
                if(err) reject(err);
                genreList = results[0].preference.split(";"); //tokenize the user preference string by ";"
                genreList.pop(); // remove the last element in the array which is an empty string.
                resolve(userSetting = genreList);
            });
        })

    }

    app.post("/wishlist/remove", (req, res) => {
        if(bookInfo.length > 0)
        {
            bookInfo.splice(bookInfo.findIndex((element) => element.title == req.body.title), 1); // remove book from the array
            let query = ["DELETE FROM wishlist WHERE titleID = (SELECT ID FROM title WHERE name = '" + req.body.title+"')"];
            connection.query(query.join(';'), (err, results) => {
                console.log("A book is removed from the wishlist");
                if (err) throw err;
                res.redirect("/wishlist");
            })
        }else{
            res.redirect("/wishlist");
        }

    });

    app.post("/wishlist/oneliner", (req, res) => {
        bookInfo.splice(bookInfo.findIndex((element) => element.title == req.body.title), 1); // remove book from the array
        let query = ["INSERT INTO oneliner VALUES ((SELECT ID FROM title WHERE name = '" + req.body.modalTitle + "'), 9 ,'" + req.body.oneliner+ "');"];
        connection.query(query.join(';'), (err, results) => {
            console.log("One liner is added to the DB.");
            if (err) throw err;

            req.session.message = {
                type: 'success',
                intro: 'Thank you!',
                message: 'Your one liner is successfully added.'
            }
            res.redirect("/wishlist");
        })
    });

    app.get("/register",(req, res) => {
        res.render("register.ejs", {title: "Registration"})
    })

    app.post("/login", (req, res)=> {
        console.log("A post request was made to /login");
    })

    app.post("/match/submit", (req, res)=> {
        console.log("Do some stuff");
    })

    app.post("/register/new-user", (req, res) => {
        if(req.body.registerPassword === req.body.registerPasswordConfirm) // check if password and password confirm are the same
        {
            let query = "INSERT INTO credential (userID, password) VALUES ('" + req.body.registerUsername + "','" + req.body.registerPassword + "');"
            connection.query(query, (err, results) =>{
                if(err) // Since USER ID is set to "UNIQUE", an exception will be thrown if the same userID already exists.
                {
                    req.session.message = {
                        type: 'danger',
                        intro: 'Username Conflict!',
                        message: 'The same username is already being used by another user. Please choose another username.'
                    }
                    res.redirect('/register');
                }
                // if there is no duplicate USER ID in the database
                else{
                    req.session.message = {
                        type: 'success',
                        intro: 'Registration successful!',
                        message: 'You are successfully registered. Please log in.'
                    }
                    res.redirect('/register');
                }
            })
        }
        else{ // Passwords do not match
            req.session.message = {
                type: 'danger',
                intro: 'Unmatched passwords',
                message: 'The provided passwords do not match.'
            }
            res.redirect('/register');
        }
        console.log("A post request was made to /register/new-user");
    })
}
