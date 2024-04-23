import { app } from "../helper.js";
import * as api from "../../api/index.js";
import { HTMLAppRouteElement } from "../index.js";
import * as routes from "../index.js";


// returns undefined if arg cannot be parsed as a base 10 number
//otherwise returns the number as a string
const cleanId = (arg) => {
  const num = parseInt(arg, 10);
  if (isNaN(num)) return undefined;
  return num.toString();
};

export const onunload = async (prev, next) => {
  // TODO: check if going from messages --> messages, if so, don't unload
  // would get rid of websockets connection when leaving messages
  console.log(`[messages] unloading ${prev.file} for ${next.file}!`);
};

const sendMessage = async (msg, fromId, toId) => {
  return api.messages.create({
    text: msg,
    fromId,
    toId,
  });
}


export default async (args, doc) => {
  app.innerHTML = "";

  console.log("** messages loaded with args", args);

  // get user id if logged in, otherwise redirect to home
  const user = await api.session.getUser();

  console.log("user", user);

  if (!user) {
    console.log("[messages] user not logged in! returning to home");
    return routes.goToRoute("home");
  }

  
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

  // sort the keys of conversations by most recent message to display most recent conversations at top
  const orderOfConversations = Object.keys(conversations).sort((a, b) => {
    const lastMsgA = conversations[a][0];
    const lastMsgB = conversations[b][0];
    return lastMsgB.time - lastMsgA.time;
  });

  console.log("conversations", conversations);
  console.log("orderOfConversations", orderOfConversations);

  // render the sidebar with all the user's conversations + msg previews
  // set all previews to not highlighted
  // all previews are links to the conversation with the other user
  const sidebarEl = doc.getElementById("message-sidebar").cloneNode(true);
  app.appendChild(sidebarEl);

  const previewContainer = document.getElementById("message-list");
  
  for (const convoKey of orderOfConversations) {
    const otherUserId = convoKey;
    const otherUser = await api.users.get(otherUserId);
    const lastMsg = conversations[convoKey][0];

    const previewEl = document.createElement("messages-sidebar-preview");
    previewEl.setAttribute("id", `preview-${otherUserId}`);

    // routes link to the right convo, removes the highlight in case it's highlighted
    const linkEl = previewEl.shadowRoot.querySelector("a");
    linkEl.setAttribute(":id", otherUserId);
    linkEl.classList.remove("selected-chat");
    
    const usernameEl = document.createElement("span");
    usernameEl.setAttribute("slot", "sidebar-username");
    usernameEl.innerText = otherUser.name;
    
    const messageEl = document.createElement("span");
    messageEl.classList.add("msg-preview-text");
    messageEl.setAttribute("slot", "preview");
    messageEl.innerText = lastMsg.text;
    
    previewEl.appendChild(usernameEl);
    previewEl.appendChild(messageEl);
    
    previewContainer.appendChild(previewEl);
  }
  
  const convoWrapperEl = document.createElement("div");
  convoWrapperEl.setAttribute("id", "conversation-wrapper");
  app.appendChild(convoWrapperEl);

  // either render a conversation or a blank conversation
  try {
    // clean up the id of other user (treats garbage id as undefined)
    const otherUserId = cleanId(args.id);
    
    // check to see if the other user exists, if doesn't error, continue rendering
    const otherUser = await api.users.get(otherUserId);
    

    // render the frame to hold the conversation
    const convoEl = doc.getElementById("conversation").cloneNode(true);
    convoWrapperEl.appendChild(convoEl);

    const convoHeaderEl = convoEl.querySelector("#convo-header");
    const messageContainerEl = convoEl.querySelector("#message-container"); // FIXME: can probably get rid of this
    const messageInputEl = convoEl.querySelector("#message-form");

    convoHeaderEl.querySelector("h2").innerText = `${otherUser.name} (@${otherUser.username})`;

    console.log("other user", otherUser);
    console.log("convoHeaderEl", convoHeaderEl);
    console.log("messageContainerEl", messageContainerEl);
    console.log("messageInputEl", messageInputEl);

    
    const createNewMessageEl = async (msg, isActiveConvo=false, updateSidebar=true) => {
      // update the sidebar preview with the new message
      // FIXME: check if this code actually runs correctly (might not be able to be checked until websockets is implemented, may have to just do a manual wait 5 seconds then trigger a message send to see if the preview updates)
      if (updateSidebar) {
        // get the preview element
        const previewEl = document.getElementById(`preview-${msg.fromId === user._id ? msg.toId : msg.fromId}`);
        // get the message element
        const messageEl = previewEl.querySelector("span.msg-preview-text");
        // update the message element
        messageEl.innerText = msg.text;
      }

      if (isActiveConvo) {
        // TODO: also render message in the conversation
        console.log("rendering new message in conversation");

        const messageEl = document.createElement("messages-message");

        const msgName = msg.fromId === user._id ? user.name : otherUser.name;
        
        const usernameEl = document.createElement("span");
        usernameEl.setAttribute("slot", "name-from");
        usernameEl.innerText = msgName;
        
        const messageContentEl = document.createElement("span");
        messageContentEl.setAttribute("slot", "msg-content");
        messageContentEl.innerText = msg.text;
        
        messageEl.appendChild(usernameEl);
        messageEl.appendChild(messageContentEl);
        

        return messageEl;
      }
    };


    if (conversations[otherUserId]) {
      messageContainerEl.append(...(
        await Promise.all(
          conversations[otherUserId].map(
            (msg) => createNewMessageEl(msg, true, false)
          )
        )
      ));
    }
    else {
      console.log(`[messages] no messages found between user ${user._id} and ${otherUserId}`);
      // TODO: else: if no messages found
        // create an empty conversation -- consider adding a ui bit to prompt "start the conversation!"
        // (allow user to send message to other user)
        // create a blank conversation in the sidebar
    }


    // add event listener to send messages
    // TODO: instead listen to submit event on form
    // messageInputEl.querySelector("#send-button").addEventListener("click", async (e) => {
    messageInputEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msgText = messageInputEl.querySelector("#message-box").value;
      if (!msgText) return;
      const sentMsg = await sendMessage(msgText, user._id, otherUserId);
      // clear the message input
      messageInputEl.querySelector("#message-box").value = "";

      // render the new message in the conversation
      messageContainerEl.prepend(
        await createNewMessageEl(sentMsg, true, true)
      );
    });

    // highlight the other user in the side bar (add a class)
    const currentPreview = document.getElementById(`preview-${otherUserId}`);
    currentPreview.shadowRoot.querySelector("a").classList.add("selected-chat");
  }
  catch (err) {
    // if there was an arg provided, log error and redirect to blank conversation
    if (args.id) {
      console.error(`[messages] error fetching conversation with user ${args.id}: ${err}`);
      return routes.goToRoute("messages");
    }

    // TODO: render a blank convo (text and/or image saying to select a conversation from the sidebar)
    const blankConvoEl = doc.getElementById("unselected-convo").cloneNode(true);
    convoWrapperEl.appendChild(blankConvoEl);
  }
};
