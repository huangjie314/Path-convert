module.exports = {
    command: 'svn log svn://192.168.61.155:11001 -l 100 -v --xml',
    user: 'JCNEP6593',
    pathReg: {
        p: /\/JobcnX\/trunk\/web/g,
        c: /\/JobcnX\/Employer\/trunk\/web/g,
        w: /\/JobcnX\/weihu\/trunk\/web/g
    },
    replaceTo: {
        p: '/web-person',
        c: '/web-employer',
        w: '/web-weihu'
    }
};