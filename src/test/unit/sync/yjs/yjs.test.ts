import * as Y from 'yjs';

suite("YJS", function () {

    test("test yjs", async function() {
        let document = new Y.Doc();

        let array = document.getArray("testArray");
        let insertMap = new Y.Map<any>();
        insertMap.set("test","test");
        array.insert(0, [insertMap]);
        array.observe(event => {
            for(let deleted of event.changes.deleted) {
                console.log(JSON.stringify(deleted));
            };
        });
        array.delete(0);

        let map = document.getMap("test");
        map.observe(event => {
            console.log(JSON.stringify(event));
        });
        map.set("test", "123");

        

        map.delete("test");
        
    });

});


