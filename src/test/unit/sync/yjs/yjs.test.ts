import * as Y from 'yjs';

suite("YJS", function () {

    test("test yjs", async function() {
        let document = new Y.Doc();

        let array = document.getArray<string>("testArray");
        array.push(["test"]);
        console.log(JSON.stringify(array));

        let text = document.getText("test");
        text.insert(0,"test");
        text.observe((event)=>{
            console.log("text: "+JSON.stringify(event.changes));
        });
        Y.transact(document, (_) => {
            text.insert(1,"a");
            text.insert(2,"b");
            text.insert(2,"cd"); 
            text.insert(6, "d");  
            text.delete(0,1);
            console.log(text.toString()); 
        });
        
    });

});


