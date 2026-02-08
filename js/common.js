var sassjs = new Sass();
var cssdiv = document.getElementById("css");

function sass_transpile(value) {
	sassjs.compile(value, function (result) {
		//console.log(result);
		cssdiv.append(result.text);
	});
}
// sass.jsここまで

// ace editorここから
var editorlist = {
	html:"html",
	scss: "scss",
	css: "css",
	javascript: "javascript"
};
var aceeditor = {};
var editor_theme = document.getElementById("theme").value;	

for (var key in editorlist){
	aceeditor[key] = ace.edit(key);
	aceeditor[key].session.setMode("ace/mode/" + key);
	aceeditor[key].setTheme("ace/theme/" + editor_theme);
	aceeditor[key].setShowInvisibles(true);
	aceeditor[key].$blockScrolling = Infinity;
	
	// editorModeを追加保持
	aceeditor[key].Language = key;
	
	aceeditor[key].on("change", function(){
		frame_update();
	});
}
// cssのみReadonly
aceeditor["css"].setReadOnly(true);

// Sassエディタを監視、変更があればトランスパイル
aceeditor["scss"].on("change", function () {
	sassjs.compile(aceeditor["scss"].getValue(), function (result) {
		if (result.text != undefined) {
			aceeditor["css"].setValue(result.text);
			aceeditor["css"].navigateFileStart();
			//frame_update();
		}
	});
});

function frame_update(){
	document.getElementById("preview_frame").innerHTML = 
		"<iframe src=" 
		+ "data:text/html,"
		+ encodeURIComponent('<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="ie=edge"><title>Document</title><style>'
		+ aceeditor["css"].getValue() 
		+ '</style></head><body>' 
		+ aceeditor["html"].getValue() 
		+ '<script>' 
		+ aceeditor["javascript"].getValue() 
		+ '</script></body></html>') 
		+ "></iframe>"
	;
}

// テーマ変更
var select_theme = document.getElementById("theme");
select_theme.onchange = function(){
	themeChange();
};
themeChange();
function themeChange(){
	editor_theme = document.getElementById("theme").value;	
	for (var key in editorlist){
		aceeditor[key].setTheme("ace/theme/" + editor_theme);
	}
}

// フォントサイズ変更
var font_size = document.getElementById("fontsize");
font_size.onchange = function(){
	fontSizeChange();
};
fontSizeChange();
function fontSizeChange(){
	var fs = parseInt(font_size.value)
	for (var key in editorlist){
		aceeditor[key].setFontSize(fs);
	}
}

// レイアウト変更
var select_layout = document.getElementById("layout");
select_layout.onchange = function(){
	var tgt = document.getElementById("editor");
	var find = tgt.children;
	var i;
	switch(this.value){
		case 'row':
		case 'column':
			tgt.style.flexDirection = this.value;
			tgt.style.flexWrap = "nowrap";
			for (i = 0; i < find.length; i++){
				find[i].style.width = "100%";
			}
			break;
		case 'wrap':
			tgt.style.flexDirection = "row";
			tgt.style.flexWrap = "wrap";
			for (i = 0; i < find.length; i++){
				find[i].style.width = "49%";
			}
			break;
		default:
			console.log("Layout Error.");
	}
};

// プレビューレイアウト変更
var select_preview = document.getElementById("preview_pos");
select_preview.onchange = function(){
	var tgt = document.getElementById("main");
	if(this.value == "vertical"){
		tgt.style.flexDirection = "column";
	} else {
		tgt.style.flexDirection = "row";
	}
}

// editor表示切り替え
document.getElementById("visible_css").onclick = function(){
	var tgt = document.getElementsByClassName("css")[0];
	if(this.checked){
		tgt.style.display = "flex";
	} else {
		tgt.style.display = "none";
	}
};

document.getElementById("visible_js").onclick = function(){
	var tgt = document.getElementsByClassName("javascript")[0];
	if(this.checked){
		tgt.style.display = "flex";
	} else {
		tgt.style.display = "none";
	}
};

// プレビュー最大化
document.getElementById("previewmode").onclick = function(){
	var tgt = document.getElementById("editor");
	if(this.checked){
		tgt.style.display = "none";
	} else {
		tgt.style.display = "flex";
	}
};


// socket.io関連------------------------------------------------------------------
var socket = io();

var edit_self = true;

// 汎化したい
aceeditor["html"].on("change", function(){
	editor_emit("html");
});
aceeditor["scss"].on("change", function(){
	editor_emit("scss");
});
aceeditor["javascript"].on("change", function(){
	editor_emit("javascript");
});

function editor_emit(lang){
	if (edit_self){
		var json = {
			editor	: lang, 
			value	: aceeditor[lang].getValue(),
		};
		socket.emit("edited", JSON.stringify(json));
	}
};

socket.on("receive", function(value){
	edit_self = false;
	var tgt = JSON.parse(value);
	aceeditor[tgt["editor"]].setValue(tgt["value"]);
	aceeditor[tgt["editor"]].clearSelection();
	edit_self = true;
});

socket.on("memberchange", function(count){
	document.getElementById("member").innerText = count + "名";
})

socket.on("dataplease", function(){
	for(lang in editorlist){
		edit_self = true;
		editor_emit(lang);
	}
})