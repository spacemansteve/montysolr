package org.apache.lucene.queryParser.aqp.config;


/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import org.apache.lucene.queryParser.core.config.QueryConfigHandler;
import org.apache.lucene.util.Attribute;
import org.apache.lucene.queryParser.aqp.processors.AqpQNORMALProcessor;


/**
 * This attribute is used by {@link AqpQNORMALProcessor} processor and
 * must be defined in the {@link QueryConfigHandler}. This attribute tells the
 * processor what is the default field when no explicit field was defined in a
 * query. <br/>
 * 
 */
public interface DefaultFieldAttribute extends Attribute {
  public void setDefaultField(String defaultField);
  public String getDefaultField();
}
