/*------------------------------*/
/* ライブラリ読込               */
/*------------------------------*/
const fs = require('fs');
const express = require('express');//expressの読込
const http = require('http');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('request');
const multer = require('multer');

const app = express();//express使用準備
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname + '/views'));
app.engine('html', require('ejs').renderFile);
app.use(express.static('assets')); //assetsファイル読み込み
app.use(bodyParser.urlencoded({ extended: true }));//フォームからの値を受け取る
app.use(multer({dest: __dirname + '/tmp/'}).single('file'));//ファイルアップロード
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie:{
    httpOnly: true,
    secure: false,
    maxage: 1000 * 60 * 30
  }
}));

/*------------------------------*/
/* 定数定義                     */
/*------------------------------*/
const GAS_BASE_URL = "https://script.google.com/macros/s/@SCRIPT_ID/exec"
const SCRIPT_ID = "AKfycbzbb1gj4eipJStbwOb97QQ_gtpLp29dc3LDIrP-4Kz_bFntUm8k1Y9-gcHC-p3eck3WTQ";
const GAS_URL   = GAS_BASE_URL.replace('@SCRIPT_ID', SCRIPT_ID);

/*------------------------------*/
/* 汎用処理                     */
/*------------------------------*/

/* GAS呼び出し(GET) */
function gasGetCall(param, callback) {
  let url = GAS_URL + param;
  console.log("GAS呼び出し(GET)", url);
  return request.get(url, callback);
}

/* GAS呼び出し(POST) */
function gasPostCall(param, data, callback) {//postはparamいらない？
  let url = GAS_URL + param;
  let options = {
    uri: url,
    headers: {
      "Content-type": "application/json"
    },
    json: true,
    followAllRedirects: true,
    body: data
  };
  console.log("GAS呼び出し(POST)", /*data*/);
  return request.post(options, callback);
}

//function register()

/*------------------------------*/
/* ルーティング設定             */
/*------------------------------*/

/* ドキュメントルート */
/* get */
//index.html
app.get('/', function (req, res) {
  console.log("一覧ページの表示を開始");
  gasGetCall("", function(e, r, b) {
    if (e) {
      console.log("エラーを表示");
      console.log(e);
    }
    console.log("/のgasGetCallのb =", b); //JSON形式で返ってきた
    let c = JSON.parse(b);
    console.log("bがparseされたc = ", c); //JSで扱える形式に変換された
    
    let idJs       = [];
    let namesJs    = [];
    let imgsJs     = [];
    
    for (let i = 0; i < c.length; i++) {
      idJs.push(c[i]["ID"]);//全アイテムのidを順に
      namesJs.push(c[i]["NAME"]);//同様に名前
      imgsJs.push(c[i]["IMG"]);//同様に画像データ
    }

    // htmlをレンダリング
    res.render('index.html', {
      itemId:idJs, 
      names:namesJs,
      imgs:imgsJs
    });
  });

});

//item.html
app.get('/item', function (req, res) {
  console.log("アイテム詳細ページの表示処理を開始");
  console.log("/itemのreq.query.id =", req.query.id);//idが存在
  console.log("/itemのreq.params.id =", req.params.id);//idがない
  //∵index.htmlでhref="/item?id=<%= itemId[i] %>"としてる
  gasGetCall("?id=" + req.query.id, function(e, r, b) {
    if (e) {
      console.log("エラーを表示");
      console.log(e);
    }
    console.log("/itemのgasGetCallで返ってきたb =", b);
    let c = JSON.parse(b);
    console.log("/itemのbをパースしたc =",c);

    let itemIdJs   = c[0]["ID"];
    let itemNameJs = c[0]["NAME"];
    let categoryJs = c[0]["CATEGORY"];
    let brandJs    = c[0]["BRAND"];
    let tokimekiJs = c[0]["TOKIMEKI"];
    let priceJs    = c[0]["PRICE"];
    let timesJs    = c[0]["TIMES"];
    let cospaJs    = c[0]["COSPA"];
    let dayJs      = c[0]["DAY"];
    let imgJs      = c[0]["IMG"];

    // htmlをレンダリング
    res.render('item.html', {
      itemId    :itemIdJs,
      itemName  :itemNameJs,
      category  :categoryJs,
      brand     :brandJs,
      tokimeki  :tokimekiJs,
      price     :priceJs,
      times     :timesJs,
      cospa     :Math.floor(Number(cospaJs)),
      day       :dayJs,
      img       :imgJs
    });
  });
  
});

//新規登録ルート
app.get('/new', (req,res) => {
  res.render('new.html');
});

/* post */

// データを追加するルーティング
app.post('/new', (req, res) => {
  console.log("新規登録を開始");
  //fileがないとつまづくのでifで場合分け
  if (req.file) {
    fs.readFile(req.file.path, 'base64', function(err, data) {
      //reqのparams,queryは空.bodyにデータ本体が入っている
      console.log("/newのreq.body.itemName", req.body.itemName);//bodyはhtmlに入力されたデータ
      // console.log("/newのreq.body.id", req.body.id);//undefined,idはhtmlで入力せずgasで振るので
      //GASにデータを追加
      gasPostCall("", {//data: body
      //キー名   :req.body.(htmlのname属性)  
      // id     :req.body.id,//undefined,新規登録でidはhtmlで入力せずgasで振る
        itemName:req.body.itemName,
        category:req.body.category,
        brand   :req.body.brand,
        tokimeki:req.body.tokimeki,
        price   :req.body.price,
        count   :req.body.count,
        cospa   :req.body.cospa,
        purchase:req.body.purchase,
        fileData:data//写真データ
      }, function(e, r, b) {
        if (e) {
          console.log("エラーを表示");
          console.log(e);
        }
        console.log("/new gasから返ってきた");
        console.log("/newのgasPostCallのreturn b =", b);
        // let c = JSON.parse(b);
        // console.log(c);
        console.log("'/'にリダイレクトする")
        res.redirect('/');
      });
    });//fs
  } else {
    //GASにデータを追加
    gasPostCall("", {//data: body
      //キー名   :req.body.(htmlのname属性)  
      // id     :req.body.id,//undefined,新規登録でidはhtmlで入力せずgasで振る
        itemName:req.body.itemName,
        category:req.body.category,
        brand   :req.body.brand,
        tokimeki:req.body.tokimeki,
        price   :req.body.price,
        count   :req.body.count,
        cospa   :req.body.cospa,
        purchase:req.body.purchase,
        // fileData:data//写真データ
      }, function(e, r, b) {
        if (e) {
          console.log("エラーを表示");
          console.log(e);
        }
        console.log("/new gasから返ってきた");
        console.log("/newのgasPostCallのreturn b =", b);
        // let c = JSON.parse(b);
        // console.log(c);
        console.log("'/'にリダイレクトする")
        res.redirect('/');
    });
  }
});

// データを更新するルーティング
app.post('/update/:id', (req, res) => {
  console.log("更新を開始")
  console.log("/updateのreq.params.id =", req.params.id);
  console.log("/updateのreq.body.id =", req.body.id);
  if (req.file) console.log("req.file", req.file);
  console.log("req.body", req.body);
  //fileがないと、ここでつまづくのでifで場合分け
  if (req.file) {
    fs.readFile(req.file.path, 'base64', function(err, data) {
      //GASのデータを更新
      gasPostCall("", {//data//req.params.idが良い？
        id      :req.body.id,//このbodyはreqのbody//htmlの/itemに入力された値
        itemName:req.body.itemName,
        category:req.body.category,
        brand   :req.body.brand,
        tokimeki:req.body.tokimeki,
        price   :req.body.price,
        count   :req.body.count,
        cospa   :req.body.cospa,
        purchase:req.body.purchase,
        fileData:data//写真データ
      }, function(e, r, b) {
        console.log("gasから返ってきた")
        if (e) {
          console.log("エラーを表示");
          console.log("e=", e);
        }
        console.log("b=", b);
        console.log("/updateから'/'にリダイレクトする")
        res.redirect('/');
      });
    });

  } else {
    //GASのデータを更新
    gasPostCall("", {//data//req.params.idが良い？
      id      :req.body.id,//このbodyはreqのbody//htmlの/itemに入力された値
      itemName:req.body.itemName,
      category:req.body.category,
      brand   :req.body.brand,
      tokimeki:req.body.tokimeki,
      price   :req.body.price,
      count   :req.body.count,
      cospa   :req.body.cospa,
      purchase:req.body.purchase,
      img     :req.body.img//写真データ
    }, function(e, r, b) {
      console.log("gasから返ってきた")
      if (e) {
        console.log("エラーを表示");
        console.log("e=", e);
      }
      console.log("b=", b);
      console.log("/updateから'/'にリダイレクトする")
      res.redirect('/');
    });
  
  } 

});

// データを削除するルーティング
app.post('/delete/:id', (req, res) => {
  console.log("削除開始")
  console.log('/delete/:idのreq.params.id',　req.params.id);//これでidの受け渡しができる//progate
  //GASのデータを削除
  gasPostCall("", {//data
    id :req.params.id,//gasPostCallはここに送るデータをおく
    dlt:true
  }, function(e, r, b) {    
    if (e) {
      console.log("エラーを表示");
      console.log(e);
    }
    console.log("gasから返ってきて、リダイレクトする");
    res.redirect('/');
  });
});

/*------------------------------*/
/* 待受設定                     */
/*------------------------------*/
app.listen(8002, ()=> {
  console.log('Start closet 8002');
});


