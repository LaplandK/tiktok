/*
 * @Description: Auto.js Pro 抖音自动化脚本
 * @Author: wwx 
 * @Date: 2025-06-14
 */

//配置
var TARGET_USER_ID = "42595183730";
var GREETING_MESSAGE = "你好,我看了你的作品觉得非常喜欢,可以交个朋友吗";
var DOUYIN_PACKAGE_NAME = "com.ss.android.ugc.aweme";
var ACTION_DELAY = 2000; // 动作延时
var WAIT_TIMEOUT = 8000; // 等待控件出现的超时时间(毫秒)
// 主程序
main();
function main() {
    if (!requestScreenCapture()) {
        toastLog("请求权限失败，脚本停止");
        return;
    }

    log("开始处理目标用户: " + TARGET_USER_ID + " ---");

    try {
        processSingleUser(TARGET_USER_ID);
        log("✅ 目标用户 " + TARGET_USER_ID + " 处理完毕。");
        toastLog("任务已全部成功完成！");
    } catch (error) {
        log("❌ 处理 " + TARGET_USER_ID + " 时出错: " + error);
        toastLog("任务执行失败，请查看日志。");
    } finally {
        // 无论成功失败，最后都返回桌面
        log("脚本执行完毕，返回桌面。");
        home();
    }
}


/**
 * 单个用户的完整流程
 * @param {string} userId - 要处理的抖音号
 */
function processSingleUser(userId) {
    launchApp(DOUYIN_PACKAGE_NAME);
    navigateToAddFriendPage();
    if (searchAndAddUser(userId)) {
        gotoUserProfile(userId);
        sendPrivateMessage();
    } else {
        log("信息：用户 " + userId + " 不存在，任务终止。");
    }
}

// 各部分功能函数
function launchApp(packageName) {
    log("▶ 启动抖音App...");
    app.launch(packageName);
    if (!text("我").findOne(WAIT_TIMEOUT)) {
        throw new Error("启动抖音后，未能找到首页的'我'按钮。");
    }
    log("√ 抖音App已成功启动并加载首页。");
    sleep(ACTION_DELAY);
}

function navigateToAddFriendPage() {
    log("▶ 导航至加好友页面...");
    var meButton = text("我").findOne(ACTION_DELAY);
    if (!meButton) {
        throw new Error("在主页找不到 '我' 按钮。");
    }
    clickByBounds(meButton, "'我'按钮");

    log("等待进入'我'的页面并查找'添加朋友'按钮...");
    var addFriendButton = id("com.ss.android.ugc.aweme:id/right_btn").findOne(WAIT_TIMEOUT);
    if (!addFriendButton) {
        log("ID定位失败，尝试 text/desc 定位...");
        addFriendButton = text("添加朋友").findOne(1000) || desc("添加朋友").findOne(1000);
    }
    if (!addFriendButton) {
        throw new Error("在'我'的页面找不到'添加朋友'按钮。请使用布局分析工具确认其ID或描述。");
    }
    clickByBounds(addFriendButton, "'添加朋友'按钮");
    log("√ 已进入加好友/搜索页面。");
    sleep(ACTION_DELAY);
}

/**
 * 搜索并添加（关注）用户 
 * @param {string} userId - 要搜索的抖音号
 * @returns {boolean} - 用户是否存在并可以继续操作
 */
function searchAndAddUser(userId) {
    log("▶ 搜索并添加用户: " + userId);

    // 找到搜索框并输入ID
    var searchInput = className("EditText").findOne(WAIT_TIMEOUT);
    if (!searchInput) {
        throw new Error("在加好友页面找不到搜索输入框(EditText)。");
    }
    searchInput.setText(userId);
    log("√ 已输入用户ID: " + userId);
    sleep(1000);

    // 模拟点击屏幕中心，让输入框失去焦点并收起键盘
    log("模拟点击屏幕中心以收起键盘...");
    var screenWidth = device.width;
    var screenHeight = device.height;
    // 在屏幕中心进行一次点击
    click(screenWidth / 2, screenHeight / 2);
    sleep(1500); // 等待键盘收起，UI状态更新

    // 再次点击搜索框，使其重新获得焦点，并触发搜索按钮的显示
    log("再次点击搜索框以显示'搜索'按钮...");
    clickByBounds(searchInput, "搜索输入框 (第二次点击)");
    sleep(1000); // 等待“搜索”按钮出现

    // 查找并点击搜索按钮
    log("查找并点击屏幕上出现的'搜索'按钮...");
    var searchButton = text("搜索").findOne(ACTION_DELAY);
    if (!searchButton) {
        log("警告: 屏幕上未找到'搜索'按钮, 尝试最终备用方案: IME键盘搜索。");
        if (!ime.search()) {
            throw new Error("执行完特殊点击序列后, 依然找不到'搜索'按钮或无法通过键盘搜索。");
        }
    } else {
        clickByBounds(searchButton, "'搜索'按钮");
    }

    log("√ 搜索操作已执行，正在检查结果...");
    if (!text("用户").findOne(WAIT_TIMEOUT)) {
        log("警告：搜索后未找到'用户'Tab，可能网络慢或无结果。");
    }
    sleep(ACTION_DELAY * 1.5);

    if (text("用户不存在").exists()) {
        log("系统提示：用户不存在。");
        return false;
    }

    var followButton = text("关注").findOne(ACTION_DELAY);
    if (followButton) {
        clickByBounds(followButton, "'关注'按钮");
        log("√ 已点击'关注'按钮。");
        sleep(ACTION_DELAY);
    } else if (text("发消息").exists() || text("已关注").exists()) {
        log("信息：用户已关注，直接进行下一步。");
    } else {
        log("警告：未找到'关注'按钮，可能页面结构有变或已经关注。");
    }
    return true;
}

function gotoUserProfile(userId) {
    log("▶ 进入用户主页 (使用ID定位)...");

    // 点击第一个搜索结果。
    var userEntry = id("i9k").findOne(WAIT_TIMEOUT);

    // 备用方案，如果ID定位失败，则回退到旧的文本定位法
    if (!userEntry) {
        log("警告：ID 'i9k' 定位失败，尝试备用方案: textContains('" + userId + "')");
        userEntry = textContains(userId).findOne(WAIT_TIMEOUT);

        if (!userEntry) {
            throw new Error("在搜索结果页使用ID和文本两种方法均找不到目标用户条目。");
        }

        // 使用的是备用方案，则需要向上查找可点击的父控件
        var clickableParent = userEntry.parent();
        while (clickableParent && !clickableParent.clickable()) {
            clickableParent = clickableParent.parent();
        }

        if (clickableParent) {
            clickByBounds(clickableParent, "用户搜索结果 (文本方案定位)");
        } else {
            throw new Error("通过文本方案定位到用户文本，但找不到其可点击的父控件。");
        }

    } else {
        // ID定位成功，直接点击
        log("√ 已通过ID 'i9k' 精准定位到第一个用户条目。");
        clickByBounds(userEntry, "第一个用户搜索结果 (id=i9k)");
    }

    // 等待“私信”按钮出现，确认已进入主页
    log("等待用户主页加载...");
    if (!(text("私信").findOne(WAIT_TIMEOUT) || desc("私信").findOne(WAIT_TIMEOUT))) {
        throw new Error("成功点击用户条目，但进入主页后未能找到'私信'按钮。");
    }
    log("√ 已成功进入用户主页。");
    sleep(ACTION_DELAY);
}

/**
 * 在用户主页发送私信
 */
function sendPrivateMessage() {
    log("▶ 发送私信...");

    // 点击“私信”按钮
    var msgBtn = text("私信").findOne(ACTION_DELAY) || desc("私信").findOne(ACTION_DELAY);
    if (!msgBtn) {
        log("⚠️ 未找到'私信'按钮，可能对方设置了隐私。任务中止。");
        back();
        return;
    }
    clickByBounds(msgBtn, "'私信'按钮");

    // 等待私信界面加载，并找到输入框
    var messageInput = id("msg_et").findOne(WAIT_TIMEOUT);
    if (!messageInput) {
        log("警告：ID 'msg_et' 定位输入框失败，尝试备用方案 className('EditText')");
        messageInput = className("EditText").findOne(WAIT_TIMEOUT);
    }
    if (!messageInput) {
        throw new Error("进入私信页面后，找不到消息输入框。");
    }
    log("√ 已进入私信页面，定位到输入框。");

    // 输入消息内容，并给予UI响应时间
    messageInput.setText(GREETING_MESSAGE);
    log("√ 已输入私信内容，等待UI更新...");
    sleep(1500);

    // 查找并点击“发送”按钮
    log("查找'发送'按钮 (ID优先)...");
    var sendButton = id("jc2").findOne(ACTION_DELAY);
    if (!sendButton) {
        log("ID 'jc2' 定位失败，尝试备用方案 desc('发送')");
        sendButton = desc("发送").findOne(ACTION_DELAY);
    }
    if (!sendButton) {
        log("desc('发送') 定位失败，尝试最终备用方案 text('发送')");
        sendButton = text("发送").findOne(ACTION_DELAY);
    }
    if (!sendButton) {
        throw new Error("输入消息后，在私信页面找不到 '发送' 按钮 (已尝试ID, desc, text)。");
    }

    clickByBounds(sendButton, "'发送'按钮");
    log("√ 私信已发送！任务圆满完成！");
    sleep(ACTION_DELAY);

    // 操作完成后，安全返回
    back();
    sleep(1000);
    back();
}
// 坐标定位的辅助函数
function clickByBounds(uiObject, name) {
    if (!uiObject) {
        throw new Error("尝试点击一个不存在的控件: " + name);
    }
    log("执行坐标点击 -> " + name);
    var bounds = uiObject.bounds();
    if (!click(bounds.centerX(), bounds.centerY())) {
        throw new Error("坐标点击失败: " + name);
    }
}