<?php

namespace MemoryLink\Tests;

use PHPUnit\Framework\TestCase;
use MemoryLink\Example;

class ExampleTest extends TestCase
{
    public function testExampleClassExists()
    {
        $example = new Example();
        $this->assertInstanceOf(Example::class, $example);
    }

    public function testGetMessageReturnsDefaultMessage()
    {
        $example = new Example();
        $this->assertEquals('Hello from MemoryLink CMS!', $example->getMessage());
    }

    public function testSetMessageChangesMessage()
    {
        $example = new Example();
        $newMessage = 'Custom message';
        $example->setMessage($newMessage);
        $this->assertEquals($newMessage, $example->getMessage());
    }

    public function testConstructorWithCustomMessage()
    {
        $customMessage = 'Custom constructor message';
        $example = new Example($customMessage);
        $this->assertEquals($customMessage, $example->getMessage());
    }
}
