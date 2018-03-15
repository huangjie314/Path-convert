var exec = require('child_process').exec;
var fs = require('fs');
var co = require('co');
var cheerio = require('cheerio');
var chalk = require('chalk');
var cfg = require('./config');
var pathReg = cfg.pathReg;
var replaceTo = cfg.replaceTo;
var results = [];
var $ = null;

/**
 * 获取SVN日志记录
 * @param  {String} command svn log命令
 * @return {Object}         Promise对象
 */
function getSvnLog(command) {
    return new Promise(function(resolve, reject) {
        exec(command, {maxBuffer: 2000*1024}, function(err, stdout, stderr) {
            if (!err) resolve(stdout);
            reject(err, stderr);
        });
    });
}

/**
 * 将内容包装到$对象
 * @param  {String} content 日志XML内容
 * @return {Object}         $ 对象
 */
function toJqueryLike(content) {
    return cheerio.load(content, {
        xmlMode: true,
        lowerCaseTags: true,
        normalizeWhitespace: true
    });
}

/**
 * 从日志中提取指定用户的SVN记录
 * @param  {String} user SVN用户名
 * @return {Array}       结果对象数组
 */
function findLogsByUser(user) {
    var logs = $('author').map(function(index, ele) {
        var $this = $(this);
        if ( $this.text() === user ) return $this.parent();
    }).get();
    return logs;
}

/**
 * 将日志转换成patch邮件模板内容
 * @param  {String} logs 待处理的日志记录
 * @return {String}      patch邮件内容
 */
function parseToMailContent(logs) {
    if (!logs) {
        throw new Error('没有待处理的日志内容......');
        return false;
    }

    var results = [];
    logs.forEach(function(log, index, logs) {
        // patch的标题
        results.push(log.find('msg').text() + '\n');

        // patch的文件路径
        var filePath = log.find('path').map(function(index, ele) {
            var path = $(this).text();
            // 路径替换
            if ( pathReg.p.test(path) ) {  // 个人
                path = path.replace(pathReg.p, replaceTo.p);
            }
            if ( pathReg.c.test(path) ) {  // 企业
                path = path.replace(pathReg.c, replaceTo.c);
            }
            if ( pathReg.w.test(path) ) {  // 维护
                path = path.replace(pathReg.w, replaceTo.w);
            }
            return path + '\n';
        }).get().join('');

        results.push(filePath + '\n');
    });
    return results.join('');
}

/**
 * 将内容输出到文件
 * @param  {String} content patch内容
 * @return {Object}         Promise
 */
function outputPatch(content) {
    return new Promise(function(resolve, reject) {
        if (!content) reject(new Error('No content to output.'));
        fs.writeFile('./patch.txt', content, function(err) {
            if (!err) resolve(true);
            reject(err);
        });
    });
}


co(function* () {
    console.log( chalk.cyan('正在向 SVN 服务器获取日志记录......') );
    return yield getSvnLog(cfg.command);
})
.then(function(content) {
    console.log( chalk.green('日志获取成功......') );
    console.log( chalk.cyan('开始处理数据......') );
    $ = toJqueryLike(content);
    var logs = findLogsByUser(cfg.user);
    var commitsCnt = parseToMailContent(logs);
    return Promise.resolve(commitsCnt);
})
.then(function(content) {
    console.log( chalk.cyan('正在输出邮件内容......') );
    outputPatch(content);
})
.then(function() {
    console.log( chalk.green('任务完成！') );
})
.catch(function(err) {
    console.log( chalk.red(err.stack) );
});
