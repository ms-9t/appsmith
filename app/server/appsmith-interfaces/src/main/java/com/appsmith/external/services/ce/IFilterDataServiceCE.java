package com.appsmith.external.services.ce;

import com.appsmith.external.constants.ConditionalOperator;
import com.appsmith.external.datatypes.AppsmithType;
import com.appsmith.external.dtos.PreparedStatementValueDTO;
import com.appsmith.external.models.Condition;
import com.appsmith.external.models.UQIDataFilterParams;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.List;
import java.util.Map;


public interface IFilterDataServiceCE {

    ArrayNode filterData(ArrayNode items, List<Condition> conditionList);

    ArrayNode filterDataNew(ArrayNode items, UQIDataFilterParams uqiDataFilterParams);

    List<Map<String, Object>> executeFilterQueryOldFormat(String tableName, List<Condition> conditions, Map<String,
            DataType> schema, Map<DataType, DataType> dataTypeConversionMaps);

    void insertAllData(String tableName, ArrayNode items, Map<String, AppsmithType> schema);

    void insertAllData(String tableName, ArrayNode items, Map<String, AppsmithType> schema, Map<AppsmithType, AppsmithType> AppsmithTypeConversionMap);

    String generateTable(Map<String, AppsmithType> schema);

    void dropTable(String tableName);

    Map<String, AppsmithType> generateSchema(ArrayNode items);

    boolean validConditionList(List<Condition> conditionList, Map<String, AppsmithType> schema);

    String generateLogicalExpression(List<Condition> conditions, List<PreparedStatementValueDTO> values,
                                     Map<String, AppsmithType> schema, ConditionalOperator logicOp);

}

