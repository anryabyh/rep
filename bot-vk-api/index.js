

        //С помощью метода wall.post создаем функцию загрузки записи в сообщества
        const url = 'https://api.vk.com/method/wall.post';
        var answer = '';
        request({
            method: 'GET',
            url: url,
            qs: {
                owner_id: '-' + gid,
                message: ptxt,
                v: 5.131,
                client_id: '7980233',
                access_token: accesTk,
                attachments: {
                    photo: "photo" + resultPhoto.response[0].owner_id + "_" + resultPhoto.response[0].id
                }
            }
        }, async function (error, response, body) {
            if (!error && response.statusCode == 200) {
                answer = body;
                if (!fs.existsSync(AppDataPath + '/post_data.json')) {
                    let data = {
                        "iteration_number": 0,
                        "date_last_itr": new Date()
                    }
                    fs.writeFileSync(AppDataPath + '/post_data.json', JSON.stringify(data), 'utf-8')
                }
                let RFile = fs.readFileSync(AppDataPath + '/post_data.json', 'utf-8')
                RFile = JSON.parse(RFile)
                if (RFile.iteration_number <= 95) {
                    RFile.iteration_number++
                    fs.writeFileSync(AppDataPath + '/post_data.json', JSON.stringify(RFile))
                }
            } else {
                console.log('Error: ' + error)
                console.log('\n\n\nRespons' + response)
            }
        })

    } else {
        let hours = Math.floor(timestamp / 60 / 60)
        let antitihours = 23 - hours 
        let minuts = ((0.59 - ((((timestamp / 60) - (hours * 60)) / 100 ))) * 100).toFixed(0)
        
        let timeDrop = ('<h1>Ошибка. Невозможно сделать более 200 постов в день</h1><h3>До сброса осталось: ' + antitihours.toString()+ ':' + minuts.toString() + '</h3>')
        document.getElementById('wpInterface').innerHTML = timeDrop
    }
}

// Поиск групп по ключевому слову
async function SearchGroups() {
    let SearchGroupRequest = document.getElementById("SearchGroupRequest").value // Берём слово из формы
    const url = 'https://api.vk.com/method/search.getHints';
    let answer = '';
    request({
        method: 'GET',
        url: url,
        qs: {
            q: SearchGroupRequest,
            limit: 200,
            filters: 'groups',
            fields: 'can_post, can_see_all_posts',
            v: 5.131,
            access_token: token,
            search_global: 1
        }
    }, async function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let json = []
            body = JSON.parse(body)
            for (let i = 0; i < body.response.items.length; i++) {
                if (body.response.items[i].group != undefined && body.response.items[i].group.can_post == 1) {
                    json.push(body.response.items[i])
                }
            }
            answer = json;
            fs.writeFileSync(AppDataPath + '/groups.json', JSON.stringify(answer), 'utf8')

            let SearchRequest = document.getElementById("SearchRequest").value
            SortJson(SearchRequest)
        }
    })
}

//---------------------------------SYSTEM SERVICE---------------------------------//

// Записываем найденные группы в БД
async function SortJson(SearchRequest) {
    let sortedJson = fs.readFileSync(AppDataPath + '/groups.json', 'utf8')
    sortedJson = sortedJson.replace(/\\"/gm, '')
    sortedJson = JSON.parse(sortedJson)
    let db = await getdata("SELECT * FROM `wall_post`")
    for (let i = 0; i < sortedJson.length; i++) {
       if(db.length >= 1){
            await postdata('UPDATE `wall_post` SET `query_text` = "'+ SearchRequest + '" , `id_group` = "'+ sortedJson[i].group.id +'" , `name_group` = "' + sortedJson[i].group.name + '" , `members` = "' + sortedJson[i].description + '" where `id` = "' + db[i].id + '" ')
        } else{
            await postdata('INSERT INTO wall_post(query_text,id_group,name_group,members)VALUES("' + SearchRequest + '",' + sortedJson[i].group.id + ', "' + sortedJson[i].group.name + '", "' + sortedJson[i].description + '")')
        }
        
    }
}

async function clearJson(){
    let clearJson = await new Promise(function (resolve) {
        let clearSave = fs.readFileSync(AppDataPath + "/save.json","utf8")
        clearSave = JSON.parse(clearSave)
        clearSave.response[0].id = undefined
        clearSave.response[0].owner_id = undefined

        fs.writeFileSync(AppDataPath + "/save.json" , JSON.stringify(clearSave) , "utf8")
    }) 
}

// Делаем рассылку по группам из БД
async function vk_poster() {
    let checkbox = await getdata("SELECT * FROM `wall_post` WHERE `checkbox` > 0")
    let post_text = document.getElementById("post_text").value


    for (let i = 0; i < checkbox.length; i++) {
        if (checkbox[i].checkbox == 'true') {
            WallPost(checkbox[i].id_group, post_text)
        }
    }

    setTimeout(clearJson , 2000)
    



}

// Загрузка картинки
async function upload_image() {

    //Вывод картинки на экран клинта
    let preview = document.querySelector('img');
    let fil = document.querySelector('input[type=file]').files[0];
    let reader = new FileReader();
    reader.onloadend = function () {
        preview.src = reader.result;

    }
    if (fil) {
        reader.readAsDataURL(fil);
    } else {
        preview.src = "";
    }
    //....................................//

    //---------------------Получение фотографии для дальнещей рассылки--------------//
    //..//

    let all_groups = fs.readFileSync(AppDataPath + '/groups.json', 'utf8')

    // photos.getWallUploadServer
    // Получаем адрес сервера для последующей загрузки картинки на сервер ВК
    let answer = ''
    //console.log(all_groups)
    const url = 'https://api.vk.com/method/photos.getWallUploadServer'



   
    let upload_url = await new Promise(function (resolve) {
        request({
            method: 'GET',
            url: url,
            qs: {
                group_id: universalGroupId,     // Пробую передать только первую группу, так как ссылка будет на картинку юудет одна и доступна для всех
                access_token: accesTk,
                v: 5.131,
            }
        }, async function (error, response, body) {
            console.log('боди : ', body)
            if (!error && response.statusCode == 200) {
                let res_body = JSON.parse(body)
                resolve(res_body.response.upload_url) // возвращаем ссылку сервера
                fs.writeFileSync(AppDataPath + '/url.json', body, 'utf8') // Записал полученный jSON в файл.
            }
        })
    })

    console.log('Вот ссылка сервера для загрузки картинок: \n', upload_url, '\n')

    // Получаем картинку из файловой системы
    let file = document.querySelector('input[type=file]').files[0];
    console.log('file:', file, '\n')
    // Формируем POST запрос
    let formdata = new FormData()
    formdata.append("photo", file, `${file.name}`);

    console.log('Отправляю картинку . . .')
    console.log("upload_url: " + upload_url)

    //Отправляем post-запрос на сервер для получения url-картинки
    let url_photo = await new Promise(function (resolve) {
        request.post({
            url: upload_url, // адрес сервера для грузки картинки
            formData: {
                'photo': {
                    'value': fs.createReadStream(file.path),
                    'options': {
                        'filename': `${file.name}`,
                        'contentType': null
                    }
                }
            }
        }, async function (err, res, body) {
            console.log("ОТВЕТ НА ЗАГРУЗКУ КАРТИНКИ: \n", body)
            if (!err && res.statusCode == 200) {
                let res_body = JSON.parse(body)
                // Вот тут возвращаю ответ
                resolve(res_body.photo)
                fs.writeFileSync(AppDataPath + "/server.json", body, 'utf8')


            }
        })
    })

    //console.log('\nВот фотография: ', url_photo, '\n')
    console.log("Я у save")

    //Читаем JSON-файл и парсим его
    let readingPhoto = fs.readFileSync(AppDataPath + "/server.json", 'utf8')
    readingPhoto = JSON.parse(readingPhoto)
    console.log("Server:" + readingPhoto.server)

    //Получения сохраненых фотографий на сервере 
    let savingUrl = await new Promise(function (resolve) {

        const saveurl = 'https://api.vk.com/method/photos.saveWallPhoto'
        console.log("Photo: " + readingPhoto.server)
        request({
            method: 'POST',
            url: saveurl,
            qs: {
                group_id: universalGroupId,
                access_token: accesTk,
                photo: readingPhoto.photo,
                server: readingPhoto.server,
                hash: readingPhoto.hash,
                v: 5.131,

            }
        }, async function (err, res, body) {
            console.log("Save: " + body)

            if (!err && res.statusCode == 200) {


                resolve(body)
                fs.writeFileSync(AppDataPath + "/save.json", body, 'utf8')
            }
        })
    })
}


//--------------------------------ИНТЕРФЕЙС И HTML--------------------------------//

let button = document.getElementById('confButton'); // Кнопка "Начать поиск" - ищет группы по ключевому слову
let checkmark = document.querySelector('svg');
let className = "animate";
// Отслеживаем нажатие на кнопку
button.addEventListener('click', function () {
    if (!checkmark.classList.contains(className)) {
        checkmark.classList.add(className);
        setTimeout(function () {
            checkmark.classList.remove(className);
        }, 2700);
    }
});


// Показываем блок с найденными группами
function wpInterface() {
    document.getElementById('wpInterface').style.display = 'block'
    document.getElementById('FoundGroups').style.display = 'none'
}


//очищаем вывод выбранных групп

async function deletegroup() {
    try {
        console.log('Я здесь')
        let result = await getdata('SELECT * FROM `wall_post`');
        if (result.length > 0) {
            await getdata('DELETE FROM `wall_post`')
        } else {
            console.log('Список групп пуст')
        }
    } catch (e) {
        console.log('Ошибка в очистке групп', e)
    }
}



//Выбор картинки
// function previewFile() {
//     let preview = document.querySelector('img');
//     let file = document.querySelector('input[type=file]').files[0];
//     let reader = new FileReader();
//     reader.onloadend = function () {
//         preview.src = reader.result;
//     }
//     if (file) {
//         reader.readAsDataURL(file);
//     } else {
//         preview.src = "";
//     }
// }

// Показывает начальный блок с поиском групп по ключевому слову
function backPage() {
    document.getElementById('MainPage').style.display = 'block';
    document.getElementById('FoundGroups').style.display = 'none';
    document.getElementById('wpInterface').style.display = 'none';
    checkboxAllFalse()
}

function groupPage() {
    document.getElementById('MainPage').style.display = 'none';
    document.getElementById('FoundGroups').style.display = 'block';
    document.getElementById('wpInterface').style.display = 'none';
}

// Открывает блок "Найденные группы" и выводит там эти группы
async function FoundGroups() {
    document.getElementById('MainPage').style.display = 'none';
    document.getElementById('FoundGroups').style.display = 'block';
    let response = await getdata('SELECT * FROM `wall_post`')

    if (response.length == 0) {
        document.getElementById('get_title_in_table').innerHTML = '<h1>ПУСТО</h1>'
        return
    }
    let post = '<table class="table TABLE_TEXT">'
    for (let i = 0; i < response.length; i++) {
        post += '<tr><th>' + response[i].id + '</th>'
        post += '<th>' + response[i].name_group + '</th>'
        post += '<td><button class="btn btn-outline-primary" onclick="copyLink(' + response[i].id + ');">Скопировать ссылку</button></td>'
        post += '<th>' + response[i].members + '</th>'
        // post += '<th><input type="checkbox" id="check_id'  + response[i].id + '" onclick="checkboxChecked()"></th></tr>'
        post += `<th>
        <fieldset class="form-check">
                <input class="form-check-input" type="checkbox" id="checkbox`+i+`" checked="checked">
                <label class="form-check-label" for="checkbox`+i+`">Classic checkbox</label>
              </fieldset>
        </tr>`
    }
    post += '</table>'
    document.getElementById('get_title_in_table').innerHTML = post
}

// Отмечаем ту группу, которая будет участвовать в рассылке
async function checkboxChecked() {
    let resp = await getdata('SELECT * FROM `wall_post`')
    for (let i = 0; i < resp.length; i++) {
        let response = await getdata('SELECT * FROM `wall_post`')
        let chbx = document.getElementById("check_id" + response[i].id);
        if (chbx.checked) {
            await postdata('UPDATE `wall_post` SET `checkbox` = "true" where `id` = ' + response[i].id + '')
        } else {
            await postdata('UPDATE `wall_post` SET `checkbox` = "false" where `id` = ' + response[i].id + '')
        }
    }
}

// Отмтетить все группы
async function checkboxAll() {
    let resp = await getdata('SELECT * FROM `wall_post`')
    for (let i = 0; i < resp.length; i++) {
        let response = await getdata('SELECT * FROM `wall_post`')
        document.getElementById("check_id" + response[i].id).checked = true
        await postdata('UPDATE `wall_post` SET `checkbox` = "true" where `id` = ' + response[i].id + '')
    }
}
async function checkboxAllFalse() {
    let resp = await getdata('SELECT * FROM `wall_post`')
    for (let i = 0; i < resp.length; i++) {
        let response = await getdata('SELECT * FROM `wall_post`')
        document.getElementById("check_id" + response[i].id).checked = false
        await postdata('UPDATE `wall_post` SET `checkbox` = "false" where `id` = ' + response[i].id + '')
    }
}
// Скопировать ссылку
async function copyLink(button_id) {
    let response = await getdata('SELECT * FROM `wall_post`')
    let textButton = ("https://vk.com/club" + response[button_id - 1].id_group);
    navigator.clipboard.writeText(textButton)
}