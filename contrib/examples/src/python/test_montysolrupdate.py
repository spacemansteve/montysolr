
"""

Poorman's unittest for running the montysolrupdate
utility

We are 'mimicking' unittests, but we do some very 
basic things only - like, run test, check for results,
clean up

"""

import sys
import optparse
import unittest
import os
from unittest import TestCase
import shutil
import glob
import time

import montysolrupdate
import subprocess
TESTDIR = '/tmp/montysolrupdate-test'
montysolrupdate.INSTDIR = TESTDIR

os.environ['ANT_HOME'] = '/usr/share/ant'
os.environ['JAVA_HOME'] = '/usr/lib/jvm/java-7-openjdk-amd64/'



class TotalNukeDuke(TestCase):
    def setUp(self):
        if os.path.exists('perpetuum'):
            subprocess.call('rm -fR %s/perpetuum' % TESTDIR, shell=True, stdout=subprocess.PIPE)
        
    def tearDown(self):
        subprocess.call('rm -fR %s/perpetuum' % TESTDIR, shell=True, stdout=subprocess.PIPE)
        

class nuke_00_starting_from_scratch(TotalNukeDuke):
    def test_00_everything_is_built(self):
        montysolrupdate.main(['foo', '-a'])
        paths_exist(['python', 
                     'python/lib/python*/site-packages/invenio',
                     'python/lib/python*/site-packages/JCC*',
                     'python/lib/python*/site-packages/MySQLdb',
                     'python/lib/python*/site-packages/numpy',
                     'python/lib/python*/site-packages/lucene*',
                     'python/lib/python*/site-packages/simplejson',
                     'python/lib/python*/site-packages/sqlalchemy',
                     'python/lib/python*/site-packages/lxml',
                     ])
        
    def test_01_fresh_installation(self):
        
        try:
            montysolrupdate.req("http://localhost:7000/solr/admin/cores")
        except:
            pass
        else:
            self.fail("There is something running on port 7000")
            
        try:
            paths_exist(['test-7000',])
        except:
            pass
        else:
            self.fail("There is something at test-7000")
        
        try:
            paths_exist(['montysolr', 'montysolr/build/contrib/examples/adsabs'])
        except:
            pass
        else:
            self.fail("There is already 'adsabs' deploy target")
            
        montysolrupdate.main(['foo', '-c', '-u', 'test-7000'])
        
        paths_exist(['test-7000',])
        rsp = montysolrupdate.req("http://localhost:7000/solr/admin/cores")
        self.assertIn('status', rsp, "The instance was not started properly")
        kill_solr('test-7000')
        

class NormalTest(TestCase):
    def setUp(self):
        pass
        
    def tearDown(self):
        cleanup("perpetuum/test-*")
    
        

# We are assuming the montysolr is already built locally
class test_01_various_tag_changes(NormalTest):
    
    def setUp(self):
        NormalTest.setUp(self)
        self.old_get = montysolrupdate.get_latest_git_release_tag
        
        def mocker(path):
            tag = self.old_get.get_latest_git_release_tag
            return self.modify(tag)
        
        montysolrupdate.get_latest_git_release_tag = mocker
        
    def tearDown(self):
        montysolrupdate.get_latest_git_release_tag = self.old_get
    
    
    def test_major_upgrade(self):
        """
        Simulate the tag version was bumped from 40.x.x.x to 41.x.x.x
        """
        curr_tag = montysolrupdate.get_release_tag("montysolr/RELEASE")
        curr_tag.major = curr_tag.major + 1
        
            
        self.intercept('get_output')
        
        montysolrupdate.main(['foo', '-c', '-u', 'test-7000'])
        
        
        
        


def cleanup(path):
    for p in glob.glob(TESTDIR + "/" + path):
        subprocess.call("rm -fR %s" % p, shell=True, stdout=subprocess.PIPE)
        
    
    
def check_pid_is_running(pid):
    if os.path.exists('/proc/%s' % pid):
        return True
    return False 

def get_pid(pidpath):
    if os.path.exists(pidpath):
        with open(pidpath, 'r') as pidfile:
            r_pid = pidfile.read().strip()
        try:
            return int(r_pid)
        except ValueError:
            return -1
    return -1

def kill_solr(path):
    path = path + '/montysolr.pid'
    pid = get_pid(path)
    if check_pid_is_running(pid):
        os.system('kill %s' % pid)
    time.sleep(0.5)
    if check_pid_is_running(pid):
        os.system('kill %s' % pid)
    time.sleep(0.5)
    if check_pid_is_running(pid):
        os.system('kill -9 %s' % pid)


def run_tests(options, tests=[]):
    if tests == None or len(tests) == 0:
        tests = get_tests()
        
        if not options.nuke:
            tests = filter(lambda x: 'nuke_' not in x, tests)
    
    this_module = sys.modules['__main__']
    for test in tests:
        test_object = getattr(this_module, test) #XXX: i do not checking
        test_suite = unittest.defaultTestLoader.loadTestsFromTestCase(test_object)
        runner = unittest.TextTestRunner(verbosity=options.verbosity)
        runner.run(test_suite)


def paths_exist(paths):
    for p in paths:
        if len(glob.glob(p)) <= 0:
            raise Exception(p)        

def get_tests():
    tests = filter(lambda x: 'test_' in x or 'nuke_' in x, dir(sys.modules['__main__']))
    tests = sorted(tests)
    return tests

def print_tests():
    print '\n'.join(get_tests())

def get_arg_parser():
    usage = '%prog [options] test1 test2....'
    p = optparse.OptionParser(usage=usage)
    p.add_option('-s', '--start_from',
                 default=1, action='store',
                 help='What test to start from',
                 type='int')
    p.add_option('-p', '--print_tests',
                 action='store_true',
                 help='Print the list of tests')
    
    p.add_option('-n', '--nuke',
                 action='store_true',
                 help='Run also the nuke tests')
    
    p.add_option('-v', '--verbosity',
                 default=3, action='store',
                 help='Verbosity', type='int')
    
    return p


def main(argv):
    
    old_cwd = os.getcwd()
    try:
        if not os.path.exists("%s/perpetuum" % TESTDIR):
            os.makedirs("%s/perpetuum" % TESTDIR)
            
        os.chdir(TESTDIR + "/perpetuum")
        parser = get_arg_parser()
        options, args = parser.parse_args(argv)
        
        if options.print_tests:
            print_tests()
        else:
            run_tests(options, args[1:])
    finally:
        os.chdir(old_cwd)


if __name__ == "__main__":
    main(sys.argv)