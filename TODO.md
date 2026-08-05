# TODO

## Build comprehensive editor (PAUSED)
IMPORTANT NOTE: The development for the comprehensive editor is currently PAUSED. Ignore this part and stop revising this folder unless this note is removed.

The user need a more comprehensive editor tool to facilitate the edit of data. Different functions need to be modularized to allow for the expansion of new features in the future. Create a GUI which allows the user to create, delete, read, update. Create a new folder named compreditor to store all these data and changes. Do not change data in other part of the repository. 

### Features
  1. Data layers
  User can open and edit the data in different layers: document, text (such as EN_01_1), sentence, and word. User can switch the focused layer among them. When read and edit the text at the sentence or word level, the user can see the context in bigger (sentence and text) level.
  User can also open and edit the dictionary.
  Generate the structure outline for the entire data. For example, text - EN - EN1 - EN1.1.
  2. Functional zones of the interface
  It should have a clean editing zone at the middle place to ensure the user's attention is focused on editing. The left and right function areas can be collapsed or popped up. 
  3. Edit mode
  Most users are not accustomed to editing raw XML data directly. So it is necessary to add other view and editing modes:
    text mode: the raw xml data is displayed in the form of plain text to show hierarchy and items. When click an item the user can change its tag or annotations, or add some annotations. The user can add branches, change the hierarchy structure. 
    table mode: all items is displayed in a table and the user can edit the table.
    tree mode: raw xml data is displayed in the syntax tree, and the user can add/delete/copy and paste/move the item/branches/annotations.
  4. Modularized fuctions
    3.1 Search
    The user can search the whole data (or choose a scope). The searched object can be a word (kamu), a lemma id (L000002), a tag (N), and so on. Or, it can also be a hierarchy structure of syntax tree. Or, it can be a relation of items.
    In advanced search, Users can feel free to specify inclusion or exclusion searching criteria at every logic point.
    3.2 Insert
    The user can insert a tag, a branch, some contents, and even add a new text. 
    Specially, when insert lemma ids, the word form can be searched in the dictionary. If it has multiple candidates, the user can choose one. Or, the user can create a new dictionary id and insert this lemma (in general create, no matter single or multiple). The user can set the beginning number of the automatical generated new lemma.
    The function can be combined with Search
    3.3 Delete
    The user can delete items.
    This function can be combined with search and/or insert to substitute.
    3.4 Revise
    The user can revise existing items.
  5. Validation
  The entire document is continuously checked. For example: A missing attribute; An element in the wrong location; A duplicate ID; An unclosed tag. These errors appear immediately in the Problems panel. Users can click on an error to navigate directly to it. After adding or deleting content, the interface needs to be updated in real time.


## Build script editor
An essential purpose for this repository is to facilitate editing of data, with the help of scripts. It is inconvenient for users to revise scripts, download the results, read them in txt, and edit data in different softwares.
Create a simple GUI which allows the user to run scripts, see the running results, and edit the data.

### Features

- For right now:
  1. User can import scripts, make settings, and run them.
  2. User can see the running results, in particular the processed text lines and processed dictionary entries. Show processed text lines and dictionary entries in two areas/pages. For processed text lines, the results should show their file, position, syntax tree path, categories (new or existing) and so on, like the output information in reports. For processed dictionary entries, the results should show the lemma ID and revised contents.

-Next Step:
  1. Differentiate the text lines having single or multiple search/processed results.
  2. User can use dictionary.
  3. User can see the context of processed text lines.
  4. User can render syntax trees.
  5. User can modify the result.

### After commit d77c4ce

Currently, there are still issues with .py scripts. Do not make any change to the current scripts. Copy them(compound_lemma_processor, lemmas_processor, mk_lemma_processor) under the folder scripteditor, then only revise the new copied scripts. Rename the copied scripts as compound_lemma_forgui, lemma_forgui, mk_lemma_forgui. When show the choice of scripts in the GUI, do not show the '_' and 'forgui'. For example, in drop-down menu, their name should be shown as 'compound lemma','lemma','mk lemma'.

#### Refine the lemmas_forgui.py to a version suitable for the GUI
1. First, check if the script works properly. Make sure its function is: 
  Based on the xml data (not the txt); 
  Searched items should be leaves without 'lemma' tag. For example,  <N index="1" phon="LOG" form="papuri" /> should be detected and automatically assigned a lemma ID. <P-COMP lemma="L000530" phon="PHON" form="to" /> should be kept since it has a 'lemma' tag;
  When a form is in the dictionary, the lemma should equal to its lemma in the dictionary;
  When a form is not in the dictionary, a new unique lemma ID should be generated, and the user can choose to automatically add the new form in the dictionary;
  The object searched by AUTO_POS_QUERY is the content in leaves. For example, it is N in <N index="1" phon="LOG" form="papuri" />. 
2. In GUI, for the left part about settings:
  put the settings about True/False at the top, then the settings requiring user to type something;
  Put the checkbox at the right of the setting, not below it;
  Add discriptions of settings. When users put their mouse on an icon like ⍰, they will be able to see the discriptions of this setting. The discriptions disappear when user move away their mouse.
3. For realisation of functions in GUI:
  Move all lemma id settings to advanced settings (LEMMA_PREFIX  = "N"    # prefix for newly generated IDs  (L, N, F, T, …)LEMMA_DIGITS  = 6      # zero-padded width  (6 → N000001)LEMMA_START   = 1      # minimum numeric value for new IDs DICT_ID_PREFIX = "T"   # prefix applied when inserting an existing dict ID);
  The default lemma prefix is L, digits=6, start=1;
  Differentiate existing lemma been added and newly generated lemma in the output result, such as mark them or put them in different categories. Same as for dictionary entries - differenciate the existing and newly created;
  NORMALIZE_DICT is not needed. Do not run it in this script. But it may be added back in the future at another place or in another script.
4. For the realisation of ADVANCED_DISAMBIG in GUI: 
  Move it to the advanced settings. The default status is true.
  Mark the result with multiple candidates in the result.

### After commit 1c41a33

Create a new folder named scripts under scripteditor, and move the py scripts into this new folder.
Since the output results of processed lines are too many, user needs some methods to manage them. Add a filter to sort through different types of results. Advanced filter would allow user to limit the scope of files processed by the script, as well as the scope and quantity of the displayed results. 

### After commit 9b52355
The processing files should also include files in COJ/data/xml/trees, such as BS.xml. Add them in processing scope. Categorise them, since there are lots of files and it would be inconvenient for the users to browse and choose. 
For lemma_forgui.py:
  1. The disambig logic in lemma_forgui.py is wrong. The content in leaf should be matched with the pos part in the dictionary. For example, nwo has two candidates L000520, L051650. Since the leaf <N phon="LOG" form="nwo" /> is N, the first choice should be <entry id="L051650"> with <pos> <value>noun</value> but not  <entry id="L000520"> <value>case particle</value>. N means noun - there should be a mapping table for POS (part of speech) abbreviations in this repository. Candidates should be ranked from highest to lowest score. But the scores do not need to be shown in GUI at the current stage.
  2. LEMMA PREFIX, LEMMA DIGITS, LEMMA START, DICT ID PREFIX - these functions are currently unused. Remove them without affecting any other functionality.
In filter, add the function to customise displayed result scope in advanced filters. For example, showing 100-200 of 380 matching changes. This function should not go against with 'Maximum displayed'. Consider refine them and make it more convenient for user to browse the result.

### After commit 9b7f7a9
Now we need to add a dictionary in the GUI. The dictionary should be able to open and hide. Basically, the user can search for form or lemma id in the dictionary. When they do so, the result should display a complete dictionary entry, in a reader-friendly format (I mean not in the raw xml data format). Also add advanced search function, which currently allows user to customise the type of data they search in the dictionary(gloss, note...), and should be compatible with more complex future functions.
The user can click the lemma id in the candidates to directly open that entry format. It should facilitate the review and search.

### After commit 389b645
Results automatically generated by the script may be inaccurate and require manual verification. Therefore, we need to add a manual review function for the output.
This function includes the following:
  1. Confirm. User thinks this item of output is problem-free. User can check the box or mark a button to confirm. Only confirmed results will be written to the final output file. A "select all" function is required, supporting selection by category. The interface needs to be clean and intuitive.
  In addition, add an optional feature allowing users to choose whether to hide confirmed result items from the results list.
  2. Choose. For results with multiple candidates, if the user finds that the highest-scoring result is not a match, they can select and switch to one of the other candidates.
  3. Add. If the user determines that there is no matching result among the candidates, they need to add a new dictionary entry. In this case, the program automatically assigns a unique new dictionary ID to the resulting form and generates the content for the "form" and "kana" tags in this dictionary entry, along with empty tags for standard dictionary entries (such as pos). User can revise, add, or delete tags.
  User can manually modify the ID number, but the system must display a warning if the numeric portion conflicts with an existing dictionary ID. 
  User can also edit the entry's content and click "Save" to add this new entry to the dictionary; however, manual confirmation is still required to commit the entries to the final output. Dictionary entries added via this method are selected by default within the dictionary output categories, though users can deselect them.

### After commit 51f138e
Currently the COJ/data is not the updatest ones. After studying scripts/data_conversion, please:
  1. Read D:\Lanxin\Desktop\data.
  2. Use these new data to substitute the old data in data/txt. (Do not change the data in D:\Lanxin\Desktop\data). Keep the original folder stucture in COJ, just substitute the files.
  3. Convert the new data to xml. Make sure they can round trip.

### After commit a188e2f
For scripteditor app:
The single candidate output do not have the option to add new entry (Multiple candidates output has). But The user need this function. Add it and improve the GUI.

### After commit a188e2f (2)
For scripteditor app:
The user need to see the context of a word. Please add a function, when the user click a word, it will be shown in the whole passage and highlighted to facilitate the read and search. The whole passage only need to have the transcriptions and kanji texts. The context should be shown at the right part of this app - do not mess up the editing area.

### After commit 354bfd9
The xml data need to be revised.
For a block, for example:
 <block id="1_EN_01" header="ugonapar eru kamu nusi papuri ra moromoro kikosi myese to noru">
    <comment raw="IP-MAT,IP-ARG,0@侍,*" />
    <comment raw="IP-MAT,IP-ARG,1@神主祝部等諸聞食登,*" />
    <comment raw="IP-MAT,2@宣,*" />
    <IP-MAT>
      <IP-ARG>
        <IP-REL>
          <VB>
            <VB-STM phon="LOG" form="ugonapar" />
            <VAX-STV-ADN phon="LOG" form="eru" />
          </VB>
        </IP-REL>
        <C-NP index="1" inferred_index="1">
          <N>
            <N phon="LOG" form="kamu" index="1" inferred_index="1" />
            <N index="2" phon="LOG" form="nusi" />
          </N>
        </C-NP>
        <C-NP index="5">
          <N>
            <N phon="LOG" form="papuri" index="1" inferred_index="1" />
            <N index="2" phon="LOG" form="ra" />
          </N>
        </C-NP>
        <NP>
          <N phon="LOG" form="moromoro" />
        </NP>
        <VB>
          <VB-STM phon="LOG" form="kikosi" />
          <VB-IMP phon="LOG" form="myese" />
        </VB>
        <P-COMP lemma="L000530" phon="PHON" form="to" />
      </IP-ARG>
      <VB-ADC phon="LOG" form="noru" />
    </IP-MAT>
  </block>

The part below is only kept for round trips to txt:
    <comment raw="IP-MAT,IP-ARG,0@侍,*" />
    <comment raw="IP-MAT,IP-ARG,1@神主祝部等諸聞食登,*" />
    <comment raw="IP-MAT,2@宣,*" />

However, the kanji text (raw text) should be encoded in every block as below logic:
  1. Let see the txt file at first:
    =N(" ugonapar eru kamu nusi papuri ra moromoro kikosi myese to noru ")
    IP-MAT,IP-ARG,0@侍,*
    IP-MAT,IP-ARG,IP-REL,VB,VB-STM,LOG,ugonapar
    IP-MAT,IP-ARG,IP-REL,VB,VAX-STV-ADN,LOG,eru
    IP-MAT,IP-ARG,1@神主祝部等諸聞食登,*
    IP-MAT,IP-ARG,C-NP,N,N,LOG,kamu
    IP-MAT,IP-ARG,C-NP,N,N;@2,LOG,nusi
    IP-MAT,IP-ARG,C-NP;@5,N,N,LOG,papuri
    IP-MAT,IP-ARG,C-NP;@5,N,N;@2,LOG,ra
    IP-MAT,IP-ARG,NP,N,LOG,moromoro
    IP-MAT,IP-ARG,VB,VB-STM,LOG,kikosi
    IP-MAT,IP-ARG,VB,VB-IMP,LOG,myese
    IP-MAT,IP-ARG,P-COMP,L000530,PHON,to
    IP-MAT,2@宣,*
    IP-MAT,VB-ADC,LOG,noru
    ID,1_EN_01
  2. The explaination for the kanji in the txt file:
  0@侍: 0@ means it is the first sentence (line) in this block (poem). 1@ means it is the second. Use numbers starting from 1 (not 0 as in txt) when encoding xml to avoid ambiguity.
  The part below 0@侍 before 1@神主祝部等諸聞食登 is the transcription for it. Ignore tags before 0@侍 and 1@神主祝部等諸聞食登 - they are meaningless and do not contribute to the syntax tree's hierarchy.
  3. As a result, the kanji should be encoded with it transcriptions as the raw text for this block as the logic:
    sentence 1
      kanji: 侍
      transcription: ugonapar eru
    sentence 2
      kanji: 神主祝部等諸聞食登
      transcription: kamu nusi papuri ra moromoro kikosi myese to
    sentence 3
      kanji: 宣
      transcription: noru
  4. ID,1_EN_01 should be encoded as EN.1.1 in xml (like MYS.1.1, because it is best to keep the ID format consistent.). 1_EN_01 can be kept somewhere if round trips need.

Make sure you clearly mark and distinguish data only used for round trips with txt and data used for processing and encoding xml data.

### After commit 9594b53
Optimise the script editor.
1. processing scope.
  Layer it. Such as 'Texts under editing - EN - EN 01 - EN 1.1''Uploaded trees - BS - BS.1'.
  Optimize the UI design for selection. Avoid using separate "Select All" and "Clear" buttons. Instead, place a selection checkbox before each level; clicking it selects that item or the entire level, while clicking again deselects it. When a level is only partially selected, display a visual state that differs from the "fully selected" state.
2. Keep global settings—such as the processed lines and the filters used for selection—fixed at the top of the page. As the user scrolls, only the processed results at the bottom should move.
3. 'EN_01.xml · utterance EN.1.1 · line 3' should be 'EN_01.xml · EN.1.1 · line 3', which means do not use the word 'utterance'.
4. The part 'Before/After' (such as Before / after
IP-MAT,IP-ARG,C-NP,N,N,LOG,kamu
IP-MAT,IP-ARG,C-NP,N,N,L051191,LOG,kamu) is useless. Delete it.
5. The "lemma ID" in the top-right corner of the search results is inconvenient to view and does not update in real-time when changes are made (as shown in the red box in the image D:\Lanxin\Pictures\Screenshots\2026-07-24 230418). Remove this lemma ID.
6. 'Add New Entry' should be a global setting. Do not put it in every single output. When user adds one new dict entry, they should be able to selete it in every choosing lemma settings. If the user deletes it later, the selection will be invalid, and the user must choose a valid value instead. If the user does not confirm this dictionary entry when generating the final output, the selection of that entry will be disregarded—meaning that no instances of that selection will be included in the final output. In either case, a warning must be displayed to the user, or an issue/problem must be indicated.
It should be noted that in this case, the chosen lemma must be also displayed in the results for single candidate, even if there is initially only one option.
7. Do not put the checkbox 'Confirm' together with Selected and Chosen lemma. It looks a bit messy the way it is now.
8. The "Manual review" function overlaps with the filter above it. Please merge them; do not name this merged filter "Manual review" - just remove that text. Furthermore, this filter is not applicable to the "Dictionary entries" and "Output files" sections; do not display this filter—which applies only to "Text lines"—when the user switches to those sections, to avoid confusion.
Consider split this filter with the functions 'Create final output' and 'Add new entry'. Do not mess them together to avoid confusion.
9. Do not use separate "Confirm selected category" and "Clear confirmations" buttons. Such a design is bloated, counterintuitive, and not aesthetically pleasing. Place a selection checkbox above the list of results that remains fixed at the top of the page as the user scrolls. Clicking it selects all results on the current page, while clicking it again deselects them.

### After commit 51f0268
1. When users scroll the page using the scrollbar on the far right of the page, they find nothing below. Fix this bug. (Shown in D:\Lanxin\Pictures\Screenshots\001545 and D:\Lanxin\Pictures\Screenshots\001521). In full-screen, the smaller scrollbar used to scroll through results are positioned very far away from the results themselves. Please arrange them closer together in an aesthetically pleasing layout.
2. Move the setting 'Hide confirmed'. Put it together with 'Select current page'.
3. The checkbox for each result should not have a double-layered border; it looks not pleasing (as shown in the red box in the image D:\Lanxin\Pictures\Screenshots\002116). Only keep one border for the checkbox.
4. Add new entry:
  4.1 Match the form: for a new dict entry added by the user, it should only be listed in the results which have the same form. For example, when the user adds a new dict entry having a .form kamu, it should only be listed under the chosen lemma list of kamu but not other words. Also add it in candidates list of kamu.
  4.2 Advanced setting: when automatically generate an unused new lemma id, the user can manually input a number for the beginning of generating. Add a button in advanced setting, when click it, automatically generate the content of .KANA based on the content of .FORM.
  4.3 tag choose: Add a small button (like triangle) next to each tag (like .FORM), and when the user clicks it, a dropdown menu will appear where user can choose an existing tag already in the dictionary or enter a new tag manually in the input box.
  5. Dictionary entries editing
  5.1 Full revised entry not needed, such as: 
    Full revised entry
    ---------------------------------------------------
    === L000001
    .GLOSS	
    .FORM	ugonapar
    .KANA	ウゴナハ⟨r⟩
    .POS
  Delete this part.
  5.2 distinguish machine added and manually added in the list. Add a tag 'USER' for the manually added entry. Also add a filter like the one in 'Text lines' for 'Dictionary entries', include the function of choosing types. Like the design in text lines, move the checkbox to the top left, add a check box for select all, put the setting 'Hide confirmed' together with 'Select current page'.
  5.3 Every dict entry in the result list should be able to be edit and delete, not just the manually added ones.
  5.4 Bug: when machine added and manually added lemma id overlap, the GUI will not warn the user. Instead, the same ID will overwrite the existing one. Fix this bug.
6. Dictionary search
  UI design: The title of the dictionary interface should not be named as 'COJ DICTIONARY Dictionary reader'. Just use 'Dictionary' as the title.

### After commit feaf983
1. Under 'Dictionary entries':
  There is a checkbox named 'Include in final output' in each entry. Delete the words 'Include in final output' and move the checkbox to the top left of each dict entry, to make the user interface cleaner and more visually appealing.
2. In Processing scope, when choose EN.1.1 under EN 01, nothing happened. Refine it - allow user to select individual passages for processing, such as selecting EN.1.1, EN.1.3, and SM.1.1. Display the total number of documents and passages selected by the user.
3. In Processing scope, when user clicks on a specific document—such as "EN 01"—it (and its upper categories, such as EN and Texts under editing, to show the hierarchy) should remain temporarily pinned at the top of the view without jumping elsewhere. It should stay pinned until the user collapses "EN 01," swipes up at the "EN 01" position, or continues to scroll down after reaching the final passage of "EN 01."

#### Revise Further
1. You misunderstand my requirement. Do not add Texts underediting EN in the title of EN 01 (and others). Delete them. What I mean is pin EN 01, EN, and Texts under editing on the top when user scrolls the passages under EN 01. Refer to the design of vs code's outline. 
2. 'Console output' is not needed. Delete it.


### TBD (editing...)
(TBD?)
Combine editor and scripteditor as a whole

1. I choose EN1.1, EN.1.3, EN.1.4 and click run processor. Nothing happened. It still only allows the user to choose a whole document otherwise it won't run. Fix it.
2. Compound lemma:
  Rename it as compound.
  revise the logic
3. Mk lemma:
  rename it as replace
  revise the logic
4. Add new entry:

## Build tree editor
Copy the folder "editor" and rename the copied folder as "treditor". Make changes within this copied folder; do not affect the original "editor" folder.
1. Optimize and revise the GUI design to make it more visually appealing and consistent with the scripteditor's style. Use blue (#6F8EC9) as the theme color.
2. Update the data it uses to keep it consistent with the current repository.

### After commit b0ad5c4
1. Users can collapse the expanded file directory on the left, thereby providing more space for the browsing view on the right.
2. For each word displayed in the syntax tree and the text, use italics to represent words with tag 'PHON' or other tag including 'PHON' (such as PHON-KUN), use underlining to represent words with tag 'NLOG', use plain to represent words with tag 'LOG' and others.
3. The functions to show 'Node metadata' and 'Round-trip comments' is not needed. Delete them.
4. User can collapse or expand the 'Passage text' part to have more room to view the syntax tree. Rename 'Passage text' as 'Text'. Moreover, user can choose to switch to a two-column view, displaying the kanji text for each line to the left of the transcription.
5. In the syntax tree, user can select whether to display the Kanji characters corresponding to the transcription of each sentence, placing the characters below the transcription. 
6. User can choose whether to display lemma ids under leaf's tags. For example, L000035 is under mi, the user can choose to display it under PFX-HON (mi's tag).
7. Users can click to expand or collapse nodes. When a node is collapsed, the corresponding word forms below are written together without spaces between them.

### After commit 7247ae5
1. User can search a poem like MYS.1.1 to show its syntax tree.
2. The document is currently displayed in two columns. This is too redundant and takes up too much space; please change it to a single column.
3. Users can scale the syntactic tree and switch to full-screen mode. The horizontal spacing between words can be adjusted to prevent the tree from becoming excessively wide after collapsing certain nodes.
4. Added a feature to expand all collapsed nodes with a single click.
5. Optimize the kanji character layout. Add some spacing around them; the current display looks uncomfortable.
6. Clicking on a word form within the syntax tree also allows user to navigate to the corresponding dictionary entry.
7. Add a function that allows users to edit the syntax tree without conflicting with the current display interface. At least, Users can directly modify the content of a node, and add or delete a child node or a sibling node for any given node.
8. Provide two options for the display position of the lemma ID: one is to display it below the word form (as in previous versions), and the other is to display it below the tag (as in the current version).

#### Revise Further
1. The single column view mode is NOT for the text. Please restore it to its original state: user can choose to switch to a two-column view, displaying the kanji text for each line to the left of the transcription.
2. Change the document selection area to a sidebar layout (View D:\Lanxin\Pictures\Screenshots\142232). Do not let the passage selection pop out as a new column; the left sidebar should consist of only one column. Moreover, Refine its hierarchical structure. For example, after expanding "texts under editing," the user can expand or collapse the category "EN," then expand or collapse the category "EN01," and finally select "EN.1.1."
3. Additionally, when user clicks on a document within the "Uploaded trees" category, that category automatically collapses and the view jumps back to "Texts under editing" (expanding it if it wasn't already open); this behavior makes for a very unpleasant user experience. Instead, when a user clicks on a specific document—such as "MYS 01"—it should remain temporarily pinned at the top of the view without jumping elsewhere. It should stay pinned until the user collapses "MYS 01," swipes up at the "MYS 01" position, or continues to scroll down after reaching the final passage of "MYS 01."
4. The "open a poem directly" function should be integrated into the "filter documents" search box, and the separate "open a poem directly" search box should be removed to simplify the interface and workflow. The system operates as follows: if a user enters a query that matches multiple documents or yields non-unique results (such as "MYS" or "MYS01"), a list of results is displayed, allowing the user to select a specific passage to open its syntax tree; however, if the user enters a unique passage identifier (such as "MYS.1.1"), the syntax tree for that passage opens directly and immediately.
5. There is an issue with the current function for adjusting word spacing. First, the adjustment range is too limited. Second, collapsing the syntactic tree causes problems where very long sentences or words are not fully displayed, overlap with adjacent words, or have their corresponding kanji characters cut off or overlapping—issues that did not exist in the previous version. Please attempt to fix this; if a fix is ​​not possible, revert to the previous version and remove this feature.
6. The current way kanji characters are displayed is terrible. Revert to the display style used in the previous version. Simply add a bit more spacing between the characters and the horizontal line above them, and do not add any unnecessary boxes or background fills around the characters.
7. For the feature where clicking a word navigates to its corresponding dictionary entry, do not apply any formatting changes to the word—such as adding a dotted line underneath. This will conflict with formatting changes caused by other annotations, thereby leading to misunderstandings. Remove it.

### After commit 927c05b
1. Optimize node display during syntax tree collapse. The "-" symbol is not displayed under normal conditions; it only appears when the mouse hovers over a node. A "+" symbol is displayed after the node is collapsed, as it is now.
2. When a user opens the webpage, the default settings should have "lemma IDs," "script tags," and "align leaves" unchecked, while "kanji under transcription" and "Null nodes" should be checked.
3. Add an "Edit" button. The syntax tree can only be edited when the user clicks this button; only then will a pen icon appear next to the syntax tree nodes.
4. Add an activity bar to the left of the sidebar. Click the icon in the activity bar to expand or collapse the sidebar. Remove the current "collapse navigation" button; user feedback indicates it is counterintuitive and hard to notice.
5. Design a corresponding icon for the current sidebar that displays the syntax tree of the clicked document.
6. Design a sidebar with search functionality and an icon for it that can be placed in the activity bar. Users can search the text content across the entire data and browse the search results in the middle. When an open syntax tree page is displayed in the center of the screen, a new tab appears to show the search results. Users can switch between the two pages or close either or both of them.
7. Delete the "Current repository data" content at the top.
8. Sections of the syntax tree can also be collapsed or expanded, making it convenient for users who simply wish to browse the full text.
9. Move statistical data  "115 documents · 5,665 passages" from the top of the page to below the "documents" section. Delete "Browse current text and uploaded-tree XML" under "documents".

### After commit b7002bf
1. When user collapses the tree diagram to expand the text, it is impossible to scroll through the full text or view the title "tree diagram". Please fix this bug. Additionally, rename "tree diagram" to "syntax tree."
2. Highlight search results.
3. Delete the content 'CORPUS SOURCES' above 'Documents'. Delete the content 'CURRENT CORPUS' above 'Search'.
4. In the search function, users can set the search scope. Moreover, When there is a large number of search results, allow users to select the maximum number of results displayed per page and navigate between pages. This feature is hidden when the number of results is small to avoid a cluttered page layout.
5. Add advanced search functions. 
6. Design and add a dictionary icon to the activity bar. When user clicks it, it will open a new tab for dictionary. Basically, user can directly search word form, lemma id, gloss, and meaning. Also add an advanced search function which allows user to choose data categories and search the dictionary. Users can also choose to have the dictionary appear as a pop-up window on the right, which can be expanded or collapsed. This design is intended to allow users to quickly consult the dictionary while clicking on words in the syntax tree or during general use. Delete the previous dictionary function in Documents section.

### After commit c837543
1. Design and add a side bar for dictionary. Currently it doesn't have one when user clicks the activity bar. Add functionality to the sidebar to trigger editing and adding dictionary entries.
2. Revise the dictionary icon. It is difficult for users to associate the current icon with the dictionary.
3. Refine the advanced search function in dictionary. It should allow users to choose all tags in the dictionary (such asKana, Note and other tags) but not just the current meanings and glossings, to search. When users hover their mouse over the "match" option in the advanced search, they will see a brief explanation of these three modes ('contains', 'whole word', and 'exact field').
4. The quick search in the dictionary pop-up should only match the lemma ID, kana, and word form; do not match meanings or glosses. Search results are displayed based on relevance; for instance, results with the highest relevance are shown first.
5. Make the POS and gloss information stand out more in the dictionary's pop-up search results, and optimize the layout and display. This information is second in importance only to the word form itself, yet the current font size and color make it very uncomfortable to read.
6. Make the POS and gloss information stand out more in the dictionary's tab search results. Also display kana and frequency in search results. Frequency represents the total number of occurrences of the corresponding lemma ID's word within the database's text, excluding the dictionary entry itself. This figure must be updated in real time. When a user clicks on the frequency number, they will be directed to the search results page displaying the occurrences of words associated with that lemma ID; the search results must also be highlighted. Kana and frequency do not need to be displayed in the search results of dictionary side pop up.

### After commit c837543 (2)
1. The current search function is still very imperfect. It cannot search for the lemma ID. Also add TGrep2 Search function to help user search the structure of syntax tree.

### After commit c837543 (3)
1. There are issues with the highlighting of current search results. For example, when users search L051650, it will also highlight L000520 which sometimes has the same word form with L051650, but it is wrong - only L051650's word form should be highlighted.
2. User can choose whether to display kanji text and sentence number in search results. Sentence number could be like: [1] amatobuya [2] karu no miti pa.
3. The current occurrences in the dictionary is wrong. First, it should be named as frequency in dictionary. Second, there are errors in its search and statistical results. For example, when user uses TGrep2 to search lemma=L051650, it has 266 results. However, in dictionary, it shows 0 occurrences, so obviously it is wrong. Please fix this.
4. In dictionary entry search results, the color of the kana is a bit too faint and hard to see clearly. Use a darker color, but avoid making it too black so as not to distract the user too much.
5. In the text&lemma section in the search function, user still can not correctly search lemma ids. In general, the search result for lemma ids should match its corresponding branches. For example, in 
 <NUM lemma="L080703">
   <NUM lemma="L002003" phon="PHON" form="mi" index="1" inferred_index="1" />
   <NUM index="2" lemma="L002032" phon="PHON" form="swo" />
 </NUM>
when user searchs L002003, it should match mi. When user searchs L080703(if it is a compound lemma id), it should match leaves within this branch, miswo. 
6. Users can choose whether to display sentence numbers in the syntax tree.
7. When a user opens a syntax tree from the search results, the corresponding search result shoule be highlighted or otherwise marked within both the syntax tree and the text. If a user searches for components not selected for display in the syntax tree—such as lemma IDs or script tags—these components should be displayed in this situtation, and the corresponding results should be highlighted or marked. When a user opens a syntax tree from another location—such as the "Documents" entry point—these highlight markers and display states are reset, reverting them to the settings the user had selected during standard browsing. This means that this type of hightlighting is a specific state tailored for displaying search results. 
8. Extend the tgrep2 search functionality to allow searching for combining two attributes on the same node without conflicting with existing search features. For example, it should allow user to search a word form 'no' is written in PHON, and moreover, a NP includes a word form 'no' written in PHON.

### After commit c837543 (4)
The last update introduced a critical bug and failed to implement the features I wanted. I’ve already reverted the changes. Let’s try again—this time, making modifications bit by bit.
1. There are issues with the highlighting of current search results. For example, when users search L051650, it will also highlight L000520 which sometimes has the same word form with L051650, but it is wrong - only L051650's word form should be highlighted.

### After commit 8c999ef
Extend the tgrep2 search functionality to allow searching for combining two attributes on the same node without conflicting with existing search features. For example, it should allow user to search a word form 'no' is written in PHON, and moreover, a NP includes a word form 'no' written in PHON.

### After commit 0787851
The current occurrences in the dictionary is wrong. First, it should be named as frequency in dictionary. Second, it should be the search result in TGrep2 of that lemma id across the whole corpus. For example, when user uses TGrep2 to search lemma=L051650, it has 266 results. However, in dictionary, it shows 0 occurrences, so obviously it is wrong. Please fix this.

### After commit 06fd3c2
1. In dictionary entry search results, the color of the kana is a bit too faint and hard to see clearly. Use a darker color, but avoid making it too black so as not to distract the user too much.
2. Currently, the search results only display the transcriptions. Refine this: User can choose whether to display kanji text and sentence number in search results. 
#### Further revision
You misunderstand my meaning for 'User can choose whether to display sentence number in search results.'. Please revise this function. Display sentence number in search results means: for example, currently, the text in search result is displayed as: kamukazeno isenoumi no opwisi ni papimotoporopu sitadami no ipapimotopori utite si yamamu; after choosing to display sentence number, it becomes: [1] kamukazeno [2] isenoumi no [3] opwisi ni [4] papimotoporopu [5] sitadami no [6] ipapimotopori [7] utite si yamamu
The same way for displaying sentence numbers also applies to kanji text when user chooses to display sentence numbers: [1] 加牟加是能 [2] 伊勢能宇美能 [3] 意斐志爾...



### TBD
1&7(高亮和搜索)、5(复合词无法正确显示)
Rename和search排版 是否match空格
BUG:1.高亮机制 3.无法搜索lemma id
1. 词典
词典侧边栏的设计
词典图标修改
词典高级搜索
词典悬浮窗quick search的机制修改
词典搜索结果页面显示
2. 搜索
逻辑和功能

3. 图标设计

4. 编辑器合并

5. 文本编辑和添加功能，以及如何将搜索功能和它们联合使用

6. 升级 tgrep2
7. 重命名 two columns, Text and Lemmas




## Build interactive editor

An essential purpose for this repository is to facilitate research for linguists. The conventional text-declarative way of uploading and editing data poses a significant hurdle.
Create a simple GUI which allows the user to perform CRUD on the database. In particular, provide an interactive editor of corpora and syntax trees.

### Features

- For right now:
  1. User can browse the corpora database, with syntax trees rendered
  2. User can view the dictionary
  3. User can search for corpus by keyword
  4. User can query the dictionary

- Next step:
  1. User can create / modify / delete entries in the dictionary
  2. User can create / modify / delete corpora.

### After commit c9e699cc

This is a great starting point.
Next commit should focus on improving tree rendering.
Linguists view syntax trees very differently from computers. A verbatim presentation of the XML is actually *not* a good visualisation of the trees.
For linguists, the basis of all the trees are the *words themselves*. The word forms, e.g. mi, kusa, ramu, should be what gets displayed as the leaf level nodes. The intermediate nodes in the hierarchy are combinations of the leaves.
Ideally, the bottom layer of the syntax tree is just the original sentence, displayed flat. The tokens in the sentence could have flexibly calculated spacings to fit the intermediate nodes in display. To make this work, the tree has to be rotated from the current vertical layout.
Let's also enable element toggle, i.e. user can select what to show and hide in the tree view.
A diagram for how it would ideally look is given at `8096.png`.

### After commit 878aa270

Basically correct.
A major issue is that currently leaf-level tags are ignored. Render them above the actual word forms. In other words, keep the original tag-tree fully rendered, and align the word forms with each leaf-level tag in the end.

### After commit 467d3067

1. Visual clutter. Check the screenshot for details. Adjust horizontal spacing.
2. Option of bottom-up vertical aligning. The current align is top-down: nodes same level from the *root* gets aligned. Include another option of bottom-up align which may have greater visual appeal to linguists. Allow the user to toggle align mode, but make bottom-up default.

### After commit 908015ac

Horizontal spacing: This is a purely aesthetic optimisation. The current tree could benefit from a horizontal adjustment of non-leaf node positions, where the x-coordinate is determined not by the mean of its direct children, but the mean of all its recursive leaf node content. This will hopefully make the tree appear more "upright" and therefore more pleasant.

### After commit bd67a7bd

Vertical spacing: Sometimes the lines intersect. Usually it's not a problem, but let's try to address it anyway by allowing the user to customise vertical spacing with a slider.

### After commit 2debd889

## Automated reasoner

Inactive (TBD).

# Completed

<details><summary> Click to expand </summary>

## Collect constants

Created `src/oncoj/common/` sub-package. ANSI escape codes and colour helpers (`bold`, `blue`,
`magenta`, `yellow`) extracted from `ascii_tree.py` into `oncoj.common.ansi`; `ascii_tree.py`
now imports from there. Linguistic constants remain in `oncoj.core.tags` (already centralised).

## Convert to Python Package

Added `[build-system]` and `[project]` tables to `pyproject.toml`. Package name `coj`,
version `0.1.0`, `requires-python = ">=3.11"`, no runtime dependencies. `src/` layout
declared via `[tool.setuptools.packages.find]`. Installable with `pip install -e .`;
dev extras (`pytest`, `ruff`) via `pip install -e ".[dev]"`.

## XML-native rewrite

Rewrote the entire codebase so that XML is the canonical format:

- `data/xml/` is primary; `data/txt/` is derived (generated by `xml2txt.py`).
- All in-memory objects (`CorpusLine`, `Utterance`, `CorpusDocument`) wrap
  `xml.etree.ElementTree` elements directly — mutations write through to the XML tree.
- `CorpusDocument.from_file` auto-detects `.xml` vs `.txt` by extension.
- `Dictionary.from_file` / `to_file` likewise auto-detect format.
- All three package-based processors (`lemmas_processor.py`,
  `compound_lemma_processor.py`, `mk_lemma_processor.py`) moved to
  `scripts/processors/` and rewritten to read/write `data/xml/`.
- `compound_lemma_processor` fully XML-native: group detection and NP expansion walk
  the `ET.Element` tree; compound ID insertion is `bare_n_elem.set("lemma", id)`.
- 221 tests pass; ruff lint clean.

## Data Representation Schema Redesign

Proposed and implemented a structured XML format for both corpus and dictionary data.
Two separate formats:
- Corpus/trees: `<document>` → `<block>` → nested syntactic elements, leaf nodes carry
  `form`, `phon`, `lemma` attributes.
- Dictionary: `<dictionary>` → `<entry id="…">` → typed field sub-elements.

Conversion scripts in `scripts/data_conversion/`: `txt2xml.py`, `xml2txt.py`, `export.py`.
Round-trips are lossless (verified by test suite).

## MK Lemma Processor

Finds `L099999` occurrences in text files, replaces them with real unique IDs, creates
corresponding makura-kotoba dictionary entries, and optionally normalises existing MK
entries missing `.COMPOUND` / `.MKTARGETNEW` lines.

## Lemmas Processor

Two-pass annotator: look up word forms in the dictionary (pass 1, with disambiguation
heuristic), assign new IDs to unknown words (pass 2). Optional dictionary normalisation.

## Compound Noun Lemma Processor

Detects adjacent `N` / `N;@2` / … sibling groups sharing a bare marker-`N`, pairs
component lemma IDs left-to-right in layers, inserts the outermost compound ID.
Optional NP expansion pre-pass wraps direct `N`-at children of `<NP>` in a bare `<N>`.

</details>
