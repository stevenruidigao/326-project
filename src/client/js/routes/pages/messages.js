import { app } from "../helper.js";
import * as api from "../../api/index.js";
import * as routes from "../index.js";


export const onunload = async (prev, next) => {
  // TODO: when implementing websockets, do not close connection if going from messages --> messages

  if (prev.file === "messages" && next.file === "messages") {
    console.log(`[messages] not unloading, loading new conversation!`);
  }
  else {
    console.log(`[messages] unloading ${prev.file} for ${next.file}!`);
  }
};



const sendMessage = async (msg, fromId, toId) => {
  return api.messages.create({
    text: msg,
    fromId,
    toId,
  });
}


export default async (args, doc) => {
  const isFullRender = routes.getPrevious()?.file !== "messages"

  if (isFullRender) {
    app.innerHTML = "";
  }


  console.log("** messages loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.getUser();


  if (!user) {
    console.log("[messages] user not logged in! returning to home");
    return routes.goToRoute("home");
  }

  const fetchSortedMessages = async () => {
    const allUserMessages = (await api.messages.allWithUser(user._id)).docs;
    
    // group messages by user
    const conversations = allUserMessages.reduce((acc, msg) => {
      const otherUserId = msg.fromId === user._id ? msg.toId : msg.fromId;
      if (!acc[otherUserId]) {
        acc[otherUserId] = [];
      }
      acc[otherUserId].push(msg);
      return acc;
    }, {});

    // in-place sort conversations by most recent message
    for (const convoKey in conversations) {
      conversations[convoKey].sort((a, b) => b.time - a.time);
    }

    console.log("[messages] fetched conversations", conversations);

    return conversations;
  }

  let conversations = await fetchSortedMessages();

  const reFetchMessages = async () => {
    conversations = await fetchSortedMessages();
  };

  // render the sidebar with all the user's conversations + msg previews
  // set all previews to not highlighted
  // all previews are links to the conversation with the other user
  if (isFullRender) {
    app.appendChild(doc.getElementById("message-sidebar").cloneNode(true));
  }
  const previewContainer = document.getElementById("message-list");
  
  const renderSidebar = async () => {
    previewContainer.innerHTML = "";

    console.log("[messages] rendering sidebar")

    await reFetchMessages();

    // sort the keys of conversations by most recent message to display most recent conversations at top
    const orderOfConversations = Object.keys(conversations).sort((a, b) => {
      const lastMsgA = conversations[a][0];
      const lastMsgB = conversations[b][0];
      return lastMsgB.time - lastMsgA.time;
    });
  
    
    for (const convoKey of orderOfConversations) {
      const otherUserId = convoKey;
      const otherUser = await api.users.get(otherUserId);
      const lastMsg = conversations[convoKey][0];
  
      const previewEl = doc.querySelector(".msg-sidebar-preview").cloneNode(true);
  
      // routes link to the right convo, removes the highlight in case it's highlighted
      const linkEl = previewEl.querySelector("a");
      linkEl.setAttribute(":id", otherUserId);
      
      linkEl.querySelector("h4").innerText = otherUser.name;
      linkEl.querySelector("p").innerText = lastMsg.text;
      
      previewContainer.appendChild(previewEl);
    }

  };
  
  // only needs to rerender if new message is sent/received
  if (isFullRender) renderSidebar();
  
  // only render the convo wrapper on a full render
  if (isFullRender) {
    const convoWrapperEl = document.createElement("div");
    convoWrapperEl.setAttribute("id", "conversation-wrapper");
    app.appendChild(convoWrapperEl);
  }
  const convoWrapperEl = document.getElementById("conversation-wrapper");
  // always clear the conversation wrapper -- rerendering this is not jarring to the user
  convoWrapperEl.innerHTML = "";

  // either render a conversation or a blank conversation
  try {
    // check to see if the other user exists, if doesn't error, continue rendering
    const otherUser = await api.users.get(args.id);
    

    // render the frame to hold the conversation
    const convoEl = doc.getElementById("conversation").cloneNode(true);
    convoWrapperEl.appendChild(convoEl);

    // grab the header, message container, and input elements
    const convoHeaderEl = convoEl.querySelector("#convo-header");
    const messageContainerEl = convoEl.querySelector("#message-container");
    const messageInputEl = convoEl.querySelector("#message-form");

    // autofocus on the message input
    // NOTE: cannot use autofocus attribute in the html since it won't refocus when changing conversations with a click
    messageInputEl.querySelector("input").focus();

    
    convoHeaderEl.querySelector("a").setAttribute(":id", otherUser._id);
    convoHeaderEl.querySelector("h2").innerText = `${otherUser.name} (@${otherUser.username})`;


    // returns a new message element to be added to a convo
    // do not use for new messages that aren't part of the current conversation
    const createNewMessageEl = async (msg) => {
      const messageEl = doc.querySelector(".message").cloneNode(true);

      const msgName = msg.fromId === user._id ? user.name : otherUser.name;
      
      const usernameEl = messageEl.querySelector("h4");
      usernameEl.innerText = msgName;
      
      const messageContentEl = messageEl.querySelector("p");
      messageContentEl.innerText = msg.text;
      
      return messageEl;
    };


    if (conversations[otherUser._id]) {
      messageContainerEl.append(...(
        await Promise.all(
          conversations[otherUser._id].map(
            (msg) => createNewMessageEl(msg)
          )
        )
      ));
    }
    else {
      console.log(`[messages] no messages found between user ${user._id} and ${otherUser._id}`);
      // NOTE: I don't think any additional code is necessary for a blank conversation
      // TODO: consider adding a ui bit to prompt "start the conversation!"
      
      // TODO: also consider creating a blank conversation in the sidebar
        // isn't strictly necessary, honestly works as is
    }


    // add event listener to send messages
    messageInputEl.addEventListener("submit", async (e) => {
      // we don't want the actual submit event to happen
      e.preventDefault();

      // get message text from the input, if empty, do nothing
      const msgText = messageInputEl.querySelector("#message-box").value;
      if (!msgText) return;

      // send message and clear the input
      const sentMsg = await sendMessage(msgText, user._id, otherUser._id);
      messageInputEl.querySelector("#message-box").value = "";

      // render the new message in the conversation
      messageContainerEl.prepend(
        await createNewMessageEl(sentMsg)
      );
      // new message requires a rerender of message previews
      renderSidebar();
    });
  }
  catch (err) {
    // if there was an arg provided, log error and redirect to blank conversation
    if (args.id) {
      console.error(`[messages] error fetching conversation with user ${args.id}: ${err}`);
      return routes.goToRoute("messages");
    }

    // if no arg provided, render a blank conversation
    const blankConvoEl = doc.getElementById("unselected-convo").cloneNode(true);
    convoWrapperEl.appendChild(blankConvoEl);
  }
};
