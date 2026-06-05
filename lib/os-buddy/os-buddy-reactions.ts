import type { OSBuddyEvent } from "./os-buddy-types";
import type { osBuddyActions } from "./os-buddy-store";

type Actions = typeof osBuddyActions;

export function handleOSBuddyReaction(event: OSBuddyEvent, actions: Actions) {
  switch (event.type) {
    case "deck:create:start":
      actions.setMood("thinking");
      actions.showBubble({ message: "Koto 幫你整理詞庫中。", kind: "system" });
      break;
    case "deck:create:success":
      actions.setMood("success", 2400);
      actions.showBubble({ message: "詞庫準備好。記得加例句同聲音。", kind: "success" });
      break;
    case "deck:create:error":
    case "vocab:save:error":
    case "selection:inspect:error":
    case "journal:correct:error":
    case "tts:error":
      actions.setMood("error", 2600);
      actions.showBubble({ message: "暫時做唔到。保留輸入，等陣再試。", kind: "error" });
      break;
    case "review:rating":
      if (event.rating === "again") {
        actions.setMood("error", 2200);
        actions.showBubble({ message: "忘記係再學一次嘅入口。", kind: "error" });
      } else if (event.rating === "hard") {
        actions.setMood("thinking", 2200);
        actions.showBubble({ message: "呢張值得短間隔再見。", kind: "context" });
      } else if (event.rating === "good") {
        actions.setMood("success", 1600);
      } else {
        actions.setMood("celebrating", 2200);
        actions.showBubble({ message: "太易，放遠啲。", kind: "success" });
      }
      break;
    case "review:complete":
      actions.setMood("celebrating", 2600);
      actions.showBubble({ message: "複習完成。今日大腦已經整理咗一輪。", kind: "success" });
      break;
    case "boot:start":
      actions.setMood("focused", 1800);
      actions.showBubble({ message: "開機模式已定。先完成第一層。", kind: "context" });
      break;
    case "boot:layer:complete":
      actions.setMood("celebrating", 2400);
      actions.showBubble({ message: "一層完成。下一層慢慢嚟。", kind: "success" });
      break;
    case "boot:layer:uncomplete":
      actions.setMood("thinking", 1800);
      actions.showBubble({ message: "改返未完成都好，系統要誠實先有用。", kind: "context" });
      break;
    case "user:idle":
      actions.setMood("sleepy");
      break;
    case "user:return":
      actions.setMood("idle");
      actions.showBubble({ message: "歡迎返嚟。做一件最細嘅日文事。", kind: "context" });
      break;
    case "focus:start":
      actions.setMood("focused");
      actions.setFocusBadge(event.durationMinutes ? `${event.durationMinutes} 分專注` : "專注中");
      actions.showBubble({ message: "你專心，我保持安靜。", kind: "context" });
      break;
    case "focus:complete":
      actions.setMood("success", 2400);
      actions.setFocusBadge(null);
      actions.showBubble({ message: "專注完成。記低一個收穫。", kind: "success" });
      break;
    case "focus:pause":
      actions.setFocusBadge("暫停");
      break;
    case "focus:resume":
      actions.setFocusBadge("專注中");
      break;
    case "tts:play":
      actions.setMood("reading", 2200);
      actions.showBubble({ message: "聽完跟讀一次。", kind: "context", companionKind: "tts" });
      break;
    case "roleplay:start":
      actions.setMood("focused", 2000);
      actions.showBubble({ message: "角色扮演先完成任務，再修語法。", kind: "context" });
      break;
    case "roleplay:complete":
      actions.setMood("celebrating", 2600);
      actions.showBubble({ message: "任務對話完成。自然度會慢慢上嚟。", kind: "success" });
      break;
    case "vocab:save:start":
    case "selection:inspect:start":
    case "journal:correct:start":
      actions.setMood("thinking");
      break;
    case "vocab:save:success":
      actions.setMood("success", 1800);
      actions.showBubble({ message: "已保存。之後可以放返複習。", kind: "success" });
      break;
    case "selection:inspect:success":
      actions.setMood("reading", 1600);
      break;
    case "mining:save":
      actions.setMood("success", 2200);
      actions.showBubble({ message: "真日文已採集。下一步變成可複習句。", kind: "success" });
      break;
    case "journal:correct:success":
      actions.setMood("success", 2200);
      actions.showBubble({ message: "日記已整理。記住一個修正就夠。", kind: "success" });
      break;
    case "grammar:add":
      actions.setMood("success", 2000);
      actions.showBubble({ message: "新文法點已加入。記得寫自己的例句。", kind: "success" });
      break;
    case "talk-me:logged":
      actions.setMood("reading", 2200);
      actions.showBubble({ message: "Talk Me 已記錄。抽一句跟讀就更實。", kind: "success" });
      break;
    case "game:start":
      actions.setMood("playful");
      break;
    case "game:complete":
      actions.incrementInteraction("gamesPlayed");
      actions.addBadge("first-game");
      actions.setMood("success", 2200);
      actions.showBubble({ message: "玩完，返去做一張複習卡。", kind: "game" });
      break;
    case "birthday:today":
      actions.setMood("celebrating");
      actions.addBadge("birthday-celebrated");
      actions.showBubble({ message: "生日像素加成。今日日文都要輕鬆啲。", kind: "birthday", durationMs: 6200 });
      break;
    case "birthday:upcoming":
      actions.showBubble({ message: `仲有 ${event.daysUntil} 日生日。先保持開機線。`, kind: "birthday" });
      break;
    default:
      break;
  }
}

