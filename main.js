import * as soui4 from "soui4";
import * as os from "os";
import * as std from "std";

var g_workDir="";

class MainDialog extends soui4.JsHostWnd{
	constructor(){
		super("layout:dlg_main");
		this.onEvt = this.onEvent;
	}

	onEvent(e){
		if(e.GetID()==8000){//event_init
			this.init();
		}else if(e.GetID()==10000 && e.Sender().GetID()==10){
			this.onEvt = 0;
			this.uninit();
			this.DestroyWindow();
		}else if(e.GetID() == 10000 && e.Sender().GetName()=="btn_clear"){
			this.onBtnClear();
		}
		return false;
	}
	
	onBtnClear(){
		this.edit_output.SetWindowText("");
	}

	onDrop(fileCount){
		let chk_contain_folder = this.FindIChildByName("chk_contain_folder");
		let bContainFolder = chk_contain_folder.IsChecked();
		let chk_window_style = this.FindIChildByName("chk_window_style");
		let bWindowStyle = chk_window_style.IsChecked();

		let edit_ext = this.FindIChildByName("edit_ext");

		let strExt = edit_ext.GetWindowText(true).toLowerCase();
		let exts = strExt.split(" ");
		
		let output ="";
		let appendFile=function(strFn, rootDir){
			let filename = strFn.toLowerCase();
			let bMatch = false;
			for(let j=0;j<exts.length && !bMatch;j++){
				if(exts[j]=="*"){
					bMatch = true;
				}else if(filename.endsWith(exts[j])){
					bMatch = true;
				}
			}
			if(bMatch){
				if(bWindowStyle==0){
					strFn = strFn.replaceAll('\\','/');
				}else{
					strFn = strFn.replaceAll('/','\\');
				}
				if(bContainFolder==0){
					strFn = strFn.substr(rootDir.length);
				}
				output += strFn + "\n";
			}
		}

		let enumDir = function(folder,rootDir){
			soui4.log("enumDir dir:"+folder);
			let dirInfo = os.readdir(folder);
			if(dirInfo[1]!=0){
				soui4.log("enumDir dir "+folder+" get error:"+ dirInfo[1]);
				return;
			}
			soui4.log("enumDir dir list:"+dirInfo[0]);
			let subDir = dirInfo[0];
			for(let i=0;i<subDir.length;i++){
				if(subDir[i] == "." || subDir[i]=="..")
					continue;
				let fullname = folder+"/"+ subDir[i];
				let fstat = os.stat(fullname);
				if(fstat[0].mode & os.S_IFDIR){
					enumDir(fullname,rootDir);
				}else{
					appendFile(fullname,rootDir);
				}
			}
		}

		for(let i=0;i<fileCount;i++){
			let filename = new soui4.SStringA();
			this.dropTarget.GetDropFileName(i,filename);
			let fn = filename.c_str();
			let pos = fn.lastIndexOf("/");
			let rootDir = "";
			if(pos!=-1){
				rootDir = fn.substr(0,pos+1);
			}
			soui4.log("root dir:"+rootDir);
			let fstat = os.stat(fn);//stat return a two element array. stat + code
			
			soui4.log("mode:"+fstat[0].mode);
			if(fstat[0].mode & os.S_IFDIR){
				enumDir(fn,rootDir);				
			}else{
				appendFile(fn,rootDir);
			}
		}
		let oldText = this.edit_output.GetWindowText(true);		
		let newText = oldText;
		if(newText=="")
			newText=output;
		else
			newText = newText+output;
		this.edit_output.SetWindowText(newText);
		this.edit_output.Update();
	}
	
	init(){
		this.EnableDragDrop();
		//enable dropdrop.
		this.edit_output=this.FindIChildByName("edit_output");
		this.dropTarget = new soui4.SDropTarget();
		this.dropTarget.cbHandler = this;
		this.dropTarget.onDrop = this.onDrop;
		this.edit_output.RegisterDragDrop(this.dropTarget);
	}
	uninit(){
		this.edit_output.UnregisterDragDrop();
		this.dropTarget=null;
	}
};


function main(inst,workDir,args)
{
	soui4.log(workDir);
	g_workDir = workDir;
	let theApp = soui4.GetApp();
	let souiFac = soui4.CreateSouiFactory();
	/*
	let resProvider = souiFac.CreateResProvider(1);
	soui4.InitFileResProvider(resProvider,workDir + "/uires");
	//*/
	//*
	// show how to load resource from a zip file
	let resProvider = soui4.CreateZipResProvider(theApp,workDir +"/uires.zip","souizip");
	if(resProvider === 0){
		soui4.log("load res from uires.zip failed");
		return -1;
	}
	//*/
	let resMgr = theApp.GetResProviderMgr();
	resMgr.AddResProvider(resProvider,"uidef:xml_init");
	resProvider.Release();
	let hwnd = soui4.GetActiveWindow();
	let hostWnd = new MainDialog();
	hostWnd.Create(hwnd,0,0,0,0);
	hostWnd.SendMessage(0x110,0,0);//send init dialog message.
	hostWnd.ShowWindow(1); //1==SW_SHOWNORMAL
	souiFac.Release();
	let ret= theApp.Run(hostWnd.GetHwnd());
	hostWnd=null;
	soui4.log("js quit");
	return ret;
}

globalThis.main=main;